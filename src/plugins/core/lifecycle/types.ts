import type { PluginLogger } from "../logger";
import type { PluginPermissionPolicy } from "../permissions";

export type PluginLifecycleState =
  | "registered"
  | "initialized"
  | "enabled"
  | "disabled"
  | "suspended"
  | "destroyed"
  | "failed";

export type PluginHealthStatus = "unknown" | "healthy" | "degraded" | "failed" | "disabled";

export type PluginHealth = {
  status: PluginHealthStatus;
  message?: string;
};

export type PluginRuntimeContext<TConfig extends object = Record<string, unknown>> = {
  pluginId: string;
  config: TConfig;
  logger: PluginLogger;
};

export type PluginLifecycleHooks<TConfig extends object = Record<string, unknown>> = {
  initialize?: (context: PluginRuntimeContext<TConfig>) => void | Promise<void>;
  enable?: (context: PluginRuntimeContext<TConfig>) => void | Promise<void>;
  disable?: (context: PluginRuntimeContext<TConfig>) => void | Promise<void>;
  suspend?: (context: PluginRuntimeContext<TConfig>) => void | Promise<void>;
  resume?: (context: PluginRuntimeContext<TConfig>) => void | Promise<void>;
  destroy?: (context: PluginRuntimeContext<TConfig>) => void | Promise<void>;
  healthCheck?: (context: PluginRuntimeContext<TConfig>) => PluginHealth | Promise<PluginHealth>;
  recover?: (context: PluginRuntimeContext<TConfig>, error: unknown) => void | Promise<void>;
};

export type PluginDefinition<TConfig extends object = Record<string, unknown>> = {
  id: string;
  name: string;
  version: string;
  flag: string;
  permissions: PluginPermissionPolicy;
  config: TConfig;
  lifecycle: PluginLifecycleHooks<TConfig>;
};

export type PluginSnapshot = {
  id: string;
  name: string;
  version: string;
  state: PluginLifecycleState;
  health: PluginHealth;
  loadTimeMs: number;
  errors: string[];
  updatedAt: number;
};
