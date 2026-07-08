import type { PluginAPIRequest, PluginAPIResponse } from "../api";
import { getPluginAPIRegistry } from "../api";
import type { PluginAsset } from "../assets";
import { getPluginAssetRegistry } from "../assets";
import type { PluginConfigSchema, PluginConfigValidation } from "../config/types";
import type { PluginContext } from "../context";
import { getPluginEventBus, type PluginEventMap } from "../events";
import type { PluginLifecycleHooks } from "../lifecycle/types";
import type { PluginLogger } from "../logger";
import type { PluginMetadata } from "../metadata/types";
import type { PluginRole } from "../permissions";
import { getPluginRuntimeManager, type PluginRuntimeExecution, type PluginRuntimeModule } from "../runtime";
import type { PluginNavigationContribution, PluginRouteContribution } from "../router";
import { getPluginRouterRegistry } from "../router";
import type { PluginServices } from "../services";
import { getPluginStorageManager, type PluginStorage, type PluginStorageMode, type PluginStorageSnapshot } from "../storage";
import type { PluginUIContribution } from "../ui";
import { getPluginUIRegistry } from "../ui";

export type PluginManifest = PluginMetadata;
export type PluginLifecycle = PluginLifecycleHooks;
export type PluginEvents = PluginEventMap;
export type PluginPermissions = PluginRole[];
export type PluginConfig<TConfig extends object = Record<string, unknown>> = {
  schema?: PluginConfigSchema<TConfig>;
  defaults: TConfig;
  validation?: PluginConfigValidation<TConfig>;
};
export type PluginDiagnostics = PluginContext["diagnostics"];
export type PluginRuntime = PluginRuntimeExecution;
export type PluginRouter = {
  route: PluginRouteContribution;
  navigation: PluginNavigationContribution;
};
export type PluginUI = PluginUIContribution;
export type PluginAssets = PluginAsset;
export type { PluginStorageMode, PluginStorageSnapshot };
export type {
  PluginAPIRequest,
  PluginAPIResponse,
  PluginConfigSchema,
  PluginConfigValidation,
  PluginContext,
  PluginLogger,
  PluginServices,
  PluginStorage,
};

export const PluginVersion = {
  sdk: "2.0.0",
  runtime: "2.0.0",
  compatibility: "2.0.0",
} as const;

export const PluginRuntime = getPluginRuntimeManager();
export const PluginStorageManager = getPluginStorageManager();
export const PluginAPI = getPluginAPIRegistry();
export const PluginRouter = getPluginRouterRegistry();
export const PluginUI = getPluginUIRegistry();
export const PluginAssets = getPluginAssetRegistry();
export const PluginEvents = getPluginEventBus();

export const PluginUtilities = {
  now: () => Date.now(),
  id: (pluginId: string, suffix: string) => `${pluginId}:${suffix}`,
  invariant: (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  },
  formatBytes: (bytes: number) => `${Math.round(bytes / 1024)} KB`,
};

export function definePlugin<TConfig extends object>(
  plugin: PluginRuntimeModule<TConfig> & { metadata: PluginMetadata },
) {
  return plugin;
}
