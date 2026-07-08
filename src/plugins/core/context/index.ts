import type { PluginEventBus } from "../events";
import { getPluginEventBus } from "../events";
import type { FeatureFlagKey } from "../feature-flags/types";
import { getPluginHealthMonitor } from "../diagnostics";
import { createPluginLogger, type PluginLogger } from "../logger";
import type { PluginMetadata } from "../metadata/types";
import type { PluginRole } from "../permissions";
import { getPluginAssetRegistry } from "../assets";
import { getPluginAPIRegistry } from "../api";
import { getPluginRouterRegistry } from "../router";
import { createPluginServices, type PluginServices } from "../services";
import { getPluginStorageManager, type PluginStorage } from "../storage";
import { getPluginUIRegistry } from "../ui";

export type PluginEnvironment = "development" | "staging" | "production";

export type PluginContextIdentity = {
  id?: string;
  role: PluginRole;
};

export type PluginContextTenant = {
  tenantId?: string;
  restaurantId?: string;
};

export type PluginContextDiagnostics = {
  heartbeat: () => void;
  markError: (error: unknown) => void;
  score: () => number;
};

export type PluginContext<TConfig extends object = Record<string, unknown>> = {
  pluginId: string;
  version: string;
  runtimeVersion: string;
  permissions: PluginRole[];
  featureFlag: FeatureFlagKey;
  logger: PluginLogger;
  eventBus: PluginEventBus;
  config: TConfig;
  storage: PluginStorage;
  navigation: ReturnType<typeof getPluginRouterRegistry>;
  router: ReturnType<typeof getPluginRouterRegistry>;
  ui: ReturnType<typeof getPluginUIRegistry>;
  assets: ReturnType<typeof getPluginAssetRegistry>;
  api: ReturnType<typeof getPluginAPIRegistry>;
  services: PluginServices;
  theme: "system";
  environment: PluginEnvironment;
  user: PluginContextIdentity;
  tenant: PluginContextTenant;
  language: string;
  timezone: string;
  diagnostics: PluginContextDiagnostics;
};

export type PluginContextOptions<TConfig extends object = Record<string, unknown>> = {
  config?: TConfig;
  runtimeVersion?: string;
  environment?: PluginEnvironment;
  user?: PluginContextIdentity;
  tenant?: PluginContextTenant;
  language?: string;
  timezone?: string;
};

export function createPluginRuntimeContext<TConfig extends object>(
  metadata: PluginMetadata,
  options: PluginContextOptions<TConfig> = {},
): PluginContext<TConfig> {
  const healthMonitor = getPluginHealthMonitor();

  return Object.freeze({
    pluginId: metadata.id,
    version: metadata.version,
    runtimeVersion: options.runtimeVersion ?? "2.0.0",
    permissions: [...metadata.permissions],
    featureFlag: metadata.featureFlag,
    logger: createPluginLogger(metadata.id),
    eventBus: getPluginEventBus(),
    config: Object.freeze({ ...(options.config ?? {}) }) as TConfig,
    storage: getPluginStorageManager().namespace(metadata.id, { mode: "memory", version: 1 }),
    navigation: getPluginRouterRegistry(),
    router: getPluginRouterRegistry(),
    ui: getPluginUIRegistry(),
    assets: getPluginAssetRegistry(),
    api: getPluginAPIRegistry(),
    services: createPluginServices(metadata.id),
    theme: "system",
    environment: options.environment ?? (process.env.NODE_ENV === "production" ? "production" : "development"),
    user: options.user ?? ({ role: "guest" } satisfies PluginContextIdentity),
    tenant: options.tenant ?? {},
    language: options.language ?? "en",
    timezone: options.timezone ?? "UTC",
    diagnostics: {
      heartbeat: () => {
        healthMonitor.heartbeat(metadata.id);
      },
      markError: () => {
        healthMonitor.recordError(metadata.id);
      },
      score: () => healthMonitor.snapshot(metadata.id)?.healthScore ?? 100,
    },
  });
}
