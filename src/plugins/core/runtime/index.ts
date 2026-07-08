import { getPluginLoader, type PluginLoadEntry } from "../loader";
import { getPluginLifecycleManager } from "../lifecycle/manager";
import type { PluginDefinition, PluginHealth } from "../lifecycle/types";
import type { PluginMetadata } from "../metadata/types";
import { getEnterprisePluginRegistry } from "../registry";
import { createPluginRuntimeContext, type PluginContext, type PluginContextOptions } from "../context";
import { createPluginSandbox, type PluginSandbox } from "../sandbox";
import { getPluginAssetRegistry } from "../assets";
import { getPluginRouterRegistry } from "../router";
import { getPluginUIRegistry } from "../ui";

export type PluginRuntimeModule<TConfig extends object = Record<string, unknown>> = {
  activate?: (context: PluginContext<TConfig>) => void | Promise<void>;
  deactivate?: (context: PluginContext<TConfig>) => void | Promise<void>;
  recover?: (context: PluginContext<TConfig>, error: unknown) => void | Promise<void>;
  healthCheck?: (context: PluginContext<TConfig>) => PluginHealth | Promise<PluginHealth>;
};

export type PluginRuntimeExecution<TConfig extends object = Record<string, unknown>> = {
  metadata: PluginMetadata;
  context: PluginContext<TConfig>;
  sandbox: PluginSandbox<TConfig>;
  load?: PluginLoadEntry<PluginRuntimeModule<TConfig>>;
  module?: PluginRuntimeModule<TConfig>;
  startedAt: number;
  updatedAt: number;
};

export type PluginRuntimeStartOptions<TConfig extends object = Record<string, unknown>> = PluginContextOptions<TConfig> & {
  load?: PluginLoadEntry<PluginRuntimeModule<TConfig>>;
};

class PluginRuntimeManager {
  private executions = new Map<string, PluginRuntimeExecution<object>>();
  private listeners = new Set<() => void>();

  async start<TConfig extends object>(metadata: PluginMetadata, options: PluginRuntimeStartOptions<TConfig> = {}) {
    if (this.executions.has(metadata.id)) {
      return this.executions.get(metadata.id) as unknown as PluginRuntimeExecution<TConfig>;
    }
    const registry = getEnterprisePluginRegistry();
    if (!registry.get(metadata.id)) registry.register(metadata);
    registry.markValidated(metadata.id);

    const context = createPluginRuntimeContext(metadata, options);
    const sandbox = createPluginSandbox(context);
    const runtimeModule = options.load
      ? await getPluginLoader().load(options.load, { timeoutMs: 5000, retries: 1 })
      : undefined;
    const definition: PluginDefinition<TConfig> = {
      id: metadata.id,
      name: metadata.displayName,
      version: metadata.version,
      flag: metadata.featureFlag,
      permissions: { roles: metadata.permissions },
      config: context.config,
      lifecycle: {
        initialize: () => runtimeModule?.activate ? sandbox.run(runtimeModule.activate) : undefined,
        enable: () => undefined,
        disable: () => runtimeModule?.deactivate ? sandbox.run(runtimeModule.deactivate) : undefined,
        destroy: () => runtimeModule?.deactivate ? sandbox.run(runtimeModule.deactivate) : undefined,
        recover: (_ctx, error) => runtimeModule?.recover
          ? sandbox.run((safeContext) => runtimeModule.recover?.(safeContext, error))
          : undefined,
        healthCheck: () => runtimeModule?.healthCheck ? sandbox.run(runtimeModule.healthCheck) : { status: "healthy" },
      },
    };

    const lifecycle = getPluginLifecycleManager();
    lifecycle.register(definition);
    registry.markInitialized(metadata.id);
    await lifecycle.initialize(metadata.id);
    await lifecycle.enable(metadata.id);
    registry.enable(metadata.id);
    registry.run(metadata.id);

    const execution = {
      metadata,
      context,
      sandbox,
      load: options.load,
      module: runtimeModule,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    } satisfies PluginRuntimeExecution<TConfig>;
    this.executions.set(metadata.id, execution as PluginRuntimeExecution<object>);
    this.emit();
    return execution;
  }

  async disable(pluginId: string) {
    await getPluginLifecycleManager().disable(pluginId);
    getEnterprisePluginRegistry().disable(pluginId);
    this.emit();
  }

  async suspend(pluginId: string) {
    await getPluginLifecycleManager().suspend(pluginId);
    getEnterprisePluginRegistry().suspend(pluginId);
    this.emit();
  }

  async resume(pluginId: string) {
    await getPluginLifecycleManager().resume(pluginId);
    const registry = getEnterprisePluginRegistry();
    registry.resume(pluginId);
    registry.run(pluginId);
    this.emit();
  }

  async reload<TConfig extends object>(pluginId: string) {
    const execution = this.executions.get(pluginId) as PluginRuntimeExecution<TConfig> | undefined;
    if (!execution) throw new Error(`Plugin is not running: ${pluginId}.`);
    const options = {
      config: execution.context.config,
      runtimeVersion: execution.context.runtimeVersion,
      environment: execution.context.environment,
      user: execution.context.user,
      tenant: execution.context.tenant,
      language: execution.context.language,
      timezone: execution.context.timezone,
      load: execution.load,
    } satisfies PluginRuntimeStartOptions<TConfig>;
    await this.destroy(pluginId);
    return this.start(execution.metadata, options);
  }

  async destroy(pluginId: string) {
    const execution = this.executions.get(pluginId);
    await getPluginLifecycleManager().destroy(pluginId);
    execution?.sandbox.destroy();
    getPluginRouterRegistry().detachPlugin(pluginId);
    getPluginUIRegistry().detachPlugin(pluginId);
    getPluginAssetRegistry().detachPlugin(pluginId);
    const registry = getEnterprisePluginRegistry();
    registry.destroy(pluginId);
    registry.unregister(pluginId);
    this.executions.delete(pluginId);
    this.emit();
  }

  async uninstall(pluginId: string) {
    await this.destroy(pluginId);
  }

  get(pluginId: string) {
    return this.executions.get(pluginId);
  }

  list() {
    return Array.from(this.executions.values());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

const pluginRuntimeManager = new PluginRuntimeManager();

export function getPluginRuntimeManager() {
  return pluginRuntimeManager;
}
