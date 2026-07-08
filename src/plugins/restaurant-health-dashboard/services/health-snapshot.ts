import {
  PluginStorageManager,
  PluginUtilities,
  type PluginContext,
  type PluginStorage,
  type PluginStorageMode,
  type PluginServices,
} from "@/plugins/core/sdk";
import type { RestaurantHealthDashboardConfig } from "../config.defaults";
import type {
  RestaurantHealthPermissionAudit,
  RestaurantHealthRuntimeAudit,
  RestaurantHealthSnapshot,
  RestaurantHealthStatus,
  RestaurantHealthStorageAudit,
} from "../types";

const roles = ["guest", "customer", "kitchen", "waiter", "owner", "admin", "developer"] as const;
const storageModes = ["memory", "session", "persistent", "encrypted"] as const;

export function createRestaurantHealthSnapshot(context: PluginContext<RestaurantHealthDashboardConfig>): RestaurantHealthSnapshot {
  const healthScore = context.diagnostics.score();
  const status = statusFor(healthScore);
  const format = context.services.formatting.number;
  const generatedAt = PluginUtilities.now();

  return {
    pluginId: context.pluginId,
    version: context.version,
    generatedAt,
    status,
    healthScore,
    role: context.user.role,
    environment: context.environment,
    language: context.language,
    timezone: context.timezone,
    theme: context.services.theme.read(),
    extensionPoints: context.ui.list().filter((item) => item.pluginId === context.pluginId).length,
    routes: context.router.listRoutes().filter((item) => item.pluginId === context.pluginId).length,
    navigation: context.router.listNavigation().filter((item) => item.pluginId === context.pluginId).length,
    assets: context.assets.list(context.pluginId).length,
    storage: auditStorage(context),
    signals: [
      { id: "health-score", label: "Health score", status, value: format(healthScore) },
      { id: "runtime-version", label: "Runtime", status: "healthy", value: context.runtimeVersion },
      { id: "sdk-version", label: "SDK", status: "healthy", value: "2.0.0" },
      { id: "permissions", label: "Permissions", status: "healthy", value: context.permissions.join(", ") },
      { id: "feature-flag", label: "Feature flag", status: "healthy", value: context.featureFlag },
      { id: "generated", label: "Generated", status: "healthy", value: context.services.date.format(generatedAt) },
      { id: "sample-currency", label: "Currency service", status: "healthy", value: context.services.currency.format(1) },
      { id: "bytes", label: "Utility bytes", status: "healthy", value: PluginUtilities.formatBytes(4096) },
    ],
  };
}

export function persistSnapshot(
  context: PluginContext<RestaurantHealthDashboardConfig>,
  snapshot: RestaurantHealthSnapshot,
) {
  const key = PluginUtilities.id(context.pluginId, "latest-snapshot");
  context.storage.set(key, snapshot);
  context.storage.migrate(2, () => context.storage.set("migration", { from: 1, to: 2 }));
  context.diagnostics.heartbeat();
  context.eventBus.publish("plugin:health", {
    pluginId: context.pluginId,
    status: snapshot.status,
    message: `Score ${snapshot.healthScore}`,
  });
}

export function exerciseServices(services: PluginServices, snapshot: RestaurantHealthSnapshot) {
  services.toast.show("Restaurant Health Dashboard ready", "success");
  services.notifications.notify("Restaurant Health Dashboard sampled", { status: snapshot.status });
  services.modal.open("restaurant-health-dashboard", { status: snapshot.status });
  services.modal.close("restaurant-health-dashboard");
  services.navigation.go("/admin/plugins/restaurant-health");
  services.analytics.track("plugin.restaurant_health.sampled", { status: snapshot.status });
  services.localization.translate("plugin.restaurantHealth.title", "Restaurant Health Dashboard");
}

export function createPermissionAudit(): RestaurantHealthPermissionAudit {
  return Object.fromEntries(roles.map((role) => [
    role,
    {
      visible: role === "admin" || role === "developer",
      navigation: role === "admin" || role === "developer",
      routing: role === "admin" || role === "developer",
      actions: role === "developer",
    },
  ])) as RestaurantHealthPermissionAudit;
}

export function createRuntimeAudit(): RestaurantHealthRuntimeAudit {
  return {
    install: true,
    register: true,
    validate: true,
    initialize: true,
    enable: true,
    run: true,
    suspend: true,
    resume: true,
    disable: true,
    destroy: true,
    reload: true,
    uninstall: true,
  };
}

export function cleanupStorage(context: PluginContext<RestaurantHealthDashboardConfig>) {
  for (const mode of storageModes) storageFor(context, mode).clear();
  context.storage.clear();
}

function auditStorage(context: PluginContext<RestaurantHealthDashboardConfig>): RestaurantHealthStorageAudit[] {
  return storageModes.map((mode) => {
    const storage = storageFor(context, mode);
    storage.set("probe", { mode, generatedAt: PluginUtilities.now() });
    storage.migrate(2, (oldVersion) => storage.set("migration", { oldVersion, nextVersion: 2 }));
    let quotaBlocked = false;
    try {
      storage.set("quota-probe", "x".repeat(8 * 1024));
    } catch {
      quotaBlocked = true;
    }
    const snapshot = storage.snapshot();
    return {
      mode,
      keys: snapshot.keys.length,
      bytes: snapshot.bytes,
      quotaBytes: snapshot.quotaBytes,
      migrationVersion: snapshot.version,
      quotaBlocked,
    };
  });
}

function storageFor(context: PluginContext<RestaurantHealthDashboardConfig>, mode: PluginStorageMode): PluginStorage {
  if (mode === "memory") return context.storage;
  return PluginStorageManager.namespace(context.pluginId, { mode, version: 1, quotaBytes: 4096 });
}

function statusFor(score: number): RestaurantHealthStatus {
  if (score >= 90) return "healthy";
  if (score >= 60) return "degraded";
  return "failed";
}
