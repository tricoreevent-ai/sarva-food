import {
  PluginRuntime,
  PluginUtilities,
  definePlugin,
  type PluginContext,
  type PluginLifecycle,
  type PluginRouter,
  type PluginUI,
} from "@/plugins/core/sdk";
import { createRestaurantHealthApiHandler } from "./api";
import { restaurantHealthDashboardAssets } from "./assets";
import {
  restaurantHealthDashboardConfigDefaults,
  type RestaurantHealthDashboardConfig,
} from "./config.defaults";
import { restaurantHealthDashboardMetadata } from "./metadata";
import {
  cleanupStorage,
  createPermissionAudit,
  createRestaurantHealthSnapshot,
  createRuntimeAudit,
  exerciseServices,
  persistSnapshot,
} from "./services/health-snapshot";
import type { RestaurantHealthSnapshot } from "./types";
import { createExtensionPayload } from "./ui/extensions";
import { validateRestaurantHealthDashboardConfig } from "./validator";

type Disposer = () => void;

const disposers = new Map<string, Disposer[]>();
const latestSnapshots = new Map<string, RestaurantHealthSnapshot>();
const extensionPoints = [
  "dashboard-cards",
  "sidebar",
  "header-actions",
  "settings-pages",
  "reports",
  "floating-panels",
  "toolbar-actions",
  "status-badges",
  "quick-actions",
  "context-menus",
  "widgets",
  "dialogs",
  "panels",
] satisfies PluginUI["point"][];

const lifecycleCoverage = {
  initialize: () => undefined,
  enable: () => undefined,
  disable: () => undefined,
  suspend: () => undefined,
  resume: () => undefined,
  destroy: () => undefined,
  healthCheck: () => ({ status: "healthy" }),
  recover: () => undefined,
} satisfies PluginLifecycle;

export default definePlugin<RestaurantHealthDashboardConfig>({
  metadata: restaurantHealthDashboardMetadata,
  async activate(context) {
    const config = mergedConfig(context);
    const validation = validateRestaurantHealthDashboardConfig(config);
    if (validation.errors.length) throw new Error(validation.errors.join(" "));

    void lifecycleCoverage;
    const snapshot = createRestaurantHealthSnapshot(context);
    latestSnapshots.set(context.pluginId, snapshot);
    persistSnapshot(context, snapshot);
    exerciseServices(context.services, snapshot);

    const offLifecycle = context.eventBus.subscribe("plugin:lifecycle", (payload) => {
      if (payload.pluginId === context.pluginId) context.logger.debug("lifecycle", payload);
    }, 1);
    const offError = context.eventBus.subscribe("plugin:error", (payload) => {
      if (payload.pluginId === context.pluginId) context.diagnostics.markError(payload.message);
    }, 1);
    const offApi = context.api.register("analytics", createRestaurantHealthApiHandler(() => latestSnapshots.get(context.pluginId)));
    const assetDisposers = restaurantHealthDashboardAssets(context.pluginId, context.version).map((asset) =>
      context.assets.register(asset),
    );
    const routeDisposers = registerRoutes(context, config, snapshot);
    const navigationDisposers = registerNavigation(context);
    const uiDisposers = registerExtensionPoints(context, snapshot);

    void context.api.call({
      pluginId: context.pluginId,
      scope: "analytics",
      action: "snapshot",
    });
    void PluginRuntime.get(context.pluginId);

    disposers.set(context.pluginId, [
      offLifecycle,
      offError,
      offApi,
      ...assetDisposers,
      ...routeDisposers,
      ...navigationDisposers,
      ...uiDisposers,
    ]);
    context.logger.info("Restaurant Health Dashboard activated", {
      extensionPoints: extensionPoints.length,
      snapshot: PluginUtilities.id(context.pluginId, "latest-snapshot"),
    });
  },
  deactivate(context) {
    for (const dispose of disposers.get(context.pluginId) ?? []) dispose();
    disposers.delete(context.pluginId);
    latestSnapshots.delete(context.pluginId);
    cleanupStorage(context);
    context.logger.info("Restaurant Health Dashboard deactivated");
  },
  recover(context, error) {
    context.diagnostics.markError(error);
    context.services.toast.show("Restaurant Health Dashboard recovered", "warning");
    context.logger.warning("recover", {
      reason: error instanceof Error ? error.message : String(error),
    });
  },
  healthCheck(context) {
    const snapshot = latestSnapshots.get(context.pluginId) ?? createRestaurantHealthSnapshot(context);
    return {
      status: snapshot.status === "failed" ? "failed" : snapshot.status,
      message: `Score ${snapshot.healthScore}`,
    };
  },
});

function registerRoutes(
  context: PluginContext<RestaurantHealthDashboardConfig>,
  config: RestaurantHealthDashboardConfig,
  snapshot: RestaurantHealthSnapshot,
) {
  const routes: PluginRouter["route"][] = [
    {
      id: `${context.pluginId}:route:admin-dashboard`,
      pluginId: context.pluginId,
      surface: "admin",
      path: "/admin/plugins/restaurant-health",
      title: "Restaurant Health",
      flag: context.featureFlag,
      permissions: context.permissions,
      load: () => import("./routes/dashboard").then((module) => module.createDashboardRoute(snapshot)),
    },
    {
      id: `${context.pluginId}:route:developer-dashboard`,
      pluginId: context.pluginId,
      surface: "developer",
      path: "/developer/plugins/restaurant-health/[section]",
      title: "Restaurant Health Developer Route",
      flag: context.featureFlag,
      permissions: ["developer"],
      load: () => import("./routes/dashboard").then((module) => module.createDashboardRoute(snapshot)),
    },
    {
      id: `${context.pluginId}:route:settings`,
      pluginId: context.pluginId,
      surface: "admin",
      path: "/admin/settings/plugins/restaurant-health",
      title: "Restaurant Health Settings",
      flag: context.featureFlag,
      permissions: context.permissions,
      load: () => import("./routes/settings").then((module) => module.createSettingsRoute(config)),
    },
    {
      id: `${context.pluginId}:route:report`,
      pluginId: context.pluginId,
      surface: "admin",
      path: "/admin/reports/plugins/restaurant-health",
      title: "Restaurant Health Report",
      flag: context.featureFlag,
      permissions: context.permissions,
      load: () => import("./routes/report").then((module) => module.createReportRoute(snapshot)),
    },
  ];
  return routes.map((route) => context.router.registerRoute(route));
}

function registerNavigation(context: PluginContext<RestaurantHealthDashboardConfig>) {
  const navigation: PluginRouter["navigation"][] = [
    {
      id: `${context.pluginId}:nav:sidebar`,
      pluginId: context.pluginId,
      surface: "admin",
      label: "Restaurant Health",
      href: "/admin/plugins/restaurant-health",
      flag: context.featureFlag,
      permissions: context.permissions,
      healthRequired: true,
      order: 20,
    },
    {
      id: `${context.pluginId}:nav:settings`,
      pluginId: context.pluginId,
      surface: "settings",
      label: "Restaurant Health",
      href: "/admin/settings/plugins/restaurant-health",
      flag: context.featureFlag,
      permissions: context.permissions,
      healthRequired: true,
      order: 40,
    },
    {
      id: `${context.pluginId}:nav:reports`,
      pluginId: context.pluginId,
      surface: "reports",
      label: "Restaurant Health",
      href: "/admin/reports/plugins/restaurant-health",
      flag: context.featureFlag,
      permissions: context.permissions,
      healthRequired: true,
      order: 60,
    },
    {
      id: `${context.pluginId}:nav:tools`,
      pluginId: context.pluginId,
      surface: "tools",
      label: "Restaurant Health",
      href: "/developer/plugins/restaurant-health/overview",
      flag: context.featureFlag,
      permissions: ["developer"],
      healthRequired: true,
      order: 80,
    },
  ];
  return navigation.map((item) => context.navigation.registerNavigation(item));
}

function registerExtensionPoints(
  context: PluginContext<RestaurantHealthDashboardConfig>,
  snapshot: RestaurantHealthSnapshot,
) {
  const permissionAudit = createPermissionAudit();
  const runtimeAudit = createRuntimeAudit();
  return extensionPoints.map((point, index) =>
    context.ui.register({
      id: `${context.pluginId}:ui:${point}`,
      pluginId: context.pluginId,
      point,
      label: `Restaurant Health ${point}`,
      flag: context.featureFlag,
      permissions: context.permissions,
      priority: 100 - index,
      load: async () => createExtensionPayload(point, snapshot, permissionAudit, runtimeAudit),
    }),
  );
}

function mergedConfig(context: PluginContext<RestaurantHealthDashboardConfig>): RestaurantHealthDashboardConfig {
  return {
    ...restaurantHealthDashboardConfigDefaults,
    ...context.config,
  };
}
