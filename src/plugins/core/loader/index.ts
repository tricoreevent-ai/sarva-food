import { getPluginEventBus } from "../events";

export type PluginLoadOptions = {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
};

export type PluginLoadEntry<TModule> = {
  id: string;
  load: () => Promise<TModule>;
};

class PluginLoader {
  private cache = new Map<string, unknown>();
  private bus = getPluginEventBus();

  async load<TModule>({ id, load }: PluginLoadEntry<TModule>, options: PluginLoadOptions = {}) {
    if (this.cache.has(id)) return this.cache.get(id) as TModule;
    const retries = options.retries ?? 1;
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const mod = await withTimeout(load(), options.timeoutMs ?? 5000, options.signal);
        this.cache.set(id, mod);
        this.bus.publish("plugin:lifecycle", { pluginId: id, state: "PluginLoaded" });
        return mod;
      } catch (error) {
        lastError = error;
      }
    }
    this.bus.publish("plugin:error", {
      pluginId: id,
      message: lastError instanceof Error ? lastError.message : String(lastError),
      recoverable: true,
    });
    throw lastError;
  }

  prefetch<TModule>(entry: PluginLoadEntry<TModule>) {
    void this.load(entry).catch(() => undefined);
  }

  unload(id: string) {
    this.cache.delete(id);
  }

  clear() {
    this.cache.clear();
  }
}

const pluginLoader = new PluginLoader();

export function getPluginLoader() {
  return pluginLoader;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Plugin load aborted.", "AbortError"));
      return;
    }
    const timer = setTimeout(() => reject(new Error(`Plugin load timed out after ${timeoutMs}ms.`)), timeoutMs);
    const abort = () => reject(new DOMException("Plugin load aborted.", "AbortError"));
    signal?.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    });
  });
}
