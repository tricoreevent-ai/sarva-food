import { getPluginEventBus } from "../events";
import { createPluginLogger } from "../logger";
import type {
  PluginDefinition,
  PluginHealth,
  PluginLifecycleState,
  PluginRuntimeContext,
  PluginSnapshot,
} from "./types";

type Entry = {
  definition: PluginDefinition<object>;
  state: PluginLifecycleState;
  health: PluginHealth;
  loadTimeMs: number;
  errors: string[];
  updatedAt: number;
  context: PluginRuntimeContext<object>;
};

class PluginLifecycleManager {
  private entries = new Map<string, Entry>();
  private bus = getPluginEventBus();

  register<TConfig extends object>(definition: PluginDefinition<TConfig>) {
    const existing = this.entries.get(definition.id);
    if (existing) return existing;
    const entry: Entry = {
      definition: definition as unknown as PluginDefinition<object>,
      state: "registered",
      health: { status: "unknown" },
      loadTimeMs: 0,
      errors: [],
      updatedAt: Date.now(),
      context: {
        pluginId: definition.id,
        config: definition.config,
        logger: createPluginLogger(definition.id),
      } as PluginRuntimeContext<object>,
    };
    this.entries.set(definition.id, entry);
    this.emit(entry, "registered");
    return entry;
  }

  async initialize(id: string) {
    const entry = this.requireEntry(id);
    if (entry.state !== "registered" && entry.state !== "disabled") return;
    await this.run(entry, "initialized", () => entry.definition.lifecycle.initialize?.(entry.context));
  }

  async enable(id: string) {
    const entry = this.requireEntry(id);
    if (entry.state === "enabled") return;
    if (entry.state === "registered") await this.initialize(id);
    await this.run(entry, "enabled", () => entry.definition.lifecycle.enable?.(entry.context));
  }

  async disable(id: string) {
    const entry = this.requireEntry(id);
    if (entry.state === "disabled") return;
    await this.run(entry, "disabled", () => entry.definition.lifecycle.disable?.(entry.context));
    entry.health = { status: "disabled" };
  }

  async suspend(id: string) {
    const entry = this.requireEntry(id);
    if (entry.state !== "enabled") return;
    await this.run(entry, "suspended", () => entry.definition.lifecycle.suspend?.(entry.context));
  }

  async resume(id: string) {
    const entry = this.requireEntry(id);
    if (entry.state !== "suspended") return;
    await this.run(entry, "enabled", () => entry.definition.lifecycle.resume?.(entry.context));
  }

  async destroy(id: string) {
    const entry = this.requireEntry(id);
    if (entry.state === "destroyed") return;
    await this.run(entry, "destroyed", () => entry.definition.lifecycle.destroy?.(entry.context));
  }

  async healthCheck(id: string) {
    const entry = this.requireEntry(id);
    if (entry.state === "disabled") return entry.health;
    try {
      entry.health = entry.definition.lifecycle.healthCheck
        ? await entry.definition.lifecycle.healthCheck(entry.context)
        : { status: entry.state === "enabled" ? "healthy" : "unknown" };
      entry.updatedAt = Date.now();
      this.bus.publish("plugin:health", {
        pluginId: entry.definition.id,
        status: entry.health.status,
        message: entry.health.message,
      });
      return entry.health;
    } catch (error) {
      await this.fail(entry, error);
      return entry.health;
    }
  }

  async recover(id: string, error: unknown) {
    const entry = this.requireEntry(id);
    try {
      await entry.definition.lifecycle.recover?.(entry.context, error);
      await this.initialize(id);
      await this.enable(id);
    } catch (nextError) {
      await this.fail(entry, nextError);
    }
  }

  getSnapshot(): PluginSnapshot[] {
    return Array.from(this.entries.values()).map((entry) => ({
      id: entry.definition.id,
      name: entry.definition.name,
      version: entry.definition.version,
      state: entry.state,
      health: entry.health,
      loadTimeMs: entry.loadTimeMs,
      errors: [...entry.errors],
      updatedAt: entry.updatedAt,
    }));
  }

  private async run(entry: Entry, state: PluginLifecycleState, action: () => void | Promise<void>) {
    const previousState = entry.state;
    const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
    try {
      await action();
      const endedAt = typeof performance === "undefined" ? Date.now() : performance.now();
      entry.state = state;
      entry.health = state === "enabled" ? { status: "healthy" } : entry.health;
      entry.loadTimeMs += Math.round(endedAt - startedAt);
      entry.updatedAt = Date.now();
      this.emit(entry, state, previousState, Math.round(endedAt - startedAt));
    } catch (error) {
      await this.fail(entry, error);
    }
  }

  private async fail(entry: Entry, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    entry.state = "failed";
    entry.health = { status: "failed", message };
    entry.errors.push(message.slice(0, 160));
    entry.updatedAt = Date.now();
    this.bus.publish("plugin:error", {
      pluginId: entry.definition.id,
      message,
      recoverable: Boolean(entry.definition.lifecycle.recover),
    });
    if (entry.errors.length >= 3) {
      await this.disable(entry.definition.id);
    }
  }

  private emit(entry: Entry, state: PluginLifecycleState, previousState?: string, durationMs?: number) {
    this.bus.publish("plugin:lifecycle", {
      pluginId: entry.definition.id,
      state,
      previousState,
      durationMs,
    });
  }

  private requireEntry(id: string) {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Plugin is not registered: ${id}`);
    return entry;
  }
}

const pluginLifecycleManager = new PluginLifecycleManager();

export function getPluginLifecycleManager() {
  return pluginLifecycleManager;
}
