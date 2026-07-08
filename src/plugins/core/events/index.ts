export type PluginEventMap = {
  "plugin:lifecycle": {
    pluginId: string;
    state: string;
    previousState?: string;
    durationMs?: number;
  };
  "plugin:error": {
    pluginId: string;
    message: string;
    recoverable: boolean;
  };
  "plugin:health": {
    pluginId: string;
    status: string;
    message?: string;
  };
  "plugin:performance": {
    pluginId: string;
    metric: string;
    value: number;
  };
  "feature-flag:changed": {
    key: string;
    enabled: boolean;
  };
};

export type PluginEventName = keyof PluginEventMap;

type Handler<K extends PluginEventName> = (payload: PluginEventMap[K]) => void;

type Entry<K extends PluginEventName> = {
  handler: Handler<K>;
  priority: number;
};

export class PluginEventBus {
  private handlers = new Map<PluginEventName, Entry<PluginEventName>[]>();

  subscribe<K extends PluginEventName>(name: K, handler: Handler<K>, priority = 0) {
    const entries = this.handlers.get(name) ?? [];
    entries.push({ handler: handler as Handler<PluginEventName>, priority });
    entries.sort((a, b) => b.priority - a.priority);
    this.handlers.set(name, entries);
    return () => this.unsubscribe(name, handler);
  }

  unsubscribe<K extends PluginEventName>(name: K, handler: Handler<K>) {
    const entries = this.handlers.get(name) ?? [];
    this.handlers.set(
      name,
      entries.filter((entry) => entry.handler !== handler),
    );
  }

  publish<K extends PluginEventName>(name: K, payload: PluginEventMap[K]) {
    for (const entry of this.handlers.get(name) ?? []) {
      try {
        entry.handler(payload);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[plugin:event-bus]", name, error);
        }
      }
    }
  }

  clear(name?: PluginEventName) {
    if (name) {
      this.handlers.delete(name);
      return;
    }
    this.handlers.clear();
  }
}

const pluginEventBus = new PluginEventBus();

export function getPluginEventBus() {
  return pluginEventBus;
}
