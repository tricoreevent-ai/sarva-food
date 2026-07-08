export type PluginStorageMode = "memory" | "session" | "persistent" | "encrypted";

export type PluginStorageOptions = {
  mode?: PluginStorageMode;
  version?: number;
  quotaBytes?: number;
};

export type PluginStorageSnapshot = {
  pluginId: string;
  mode: PluginStorageMode;
  version: number;
  keys: string[];
  bytes: number;
  quotaBytes: number;
};

export type PluginStorage = {
  get: <T>(key: string) => T | undefined;
  set: <T>(key: string, value: T) => void;
  remove: (key: string) => void;
  keys: () => string[];
  clear: () => void;
  migrate: (version: number, migrate: (oldVersion: number) => void) => void;
  cleanup: () => void;
  snapshot: () => PluginStorageSnapshot;
};

const memoryStore = new Map<string, string>();

class PluginStorageNamespace implements PluginStorage {
  private version: number;
  private quotaBytes: number;

  constructor(
    private pluginId: string,
    private mode: PluginStorageMode,
    options: PluginStorageOptions,
  ) {
    this.version = options.version ?? 1;
    this.quotaBytes = options.quotaBytes ?? 64 * 1024;
  }

  get<T>(key: string) {
    const raw = this.backend().getItem(this.key(key));
    if (!raw) return undefined;
    return this.decode<T>(raw);
  }

  set<T>(key: string, value: T) {
    const raw = this.encode(value);
    if (raw.length > this.quotaBytes) throw new Error(`Plugin storage quota exceeded: ${this.pluginId}.`);
    this.backend().setItem(this.key(key), raw);
  }

  remove(key: string) {
    this.backend().removeItem(this.key(key));
  }

  keys() {
    return this.backend().keys().filter((key) => key.startsWith(this.prefix())).map((key) => key.slice(this.prefix().length));
  }

  clear() {
    for (const key of this.keys()) this.remove(key);
  }

  migrate(version: number, migrate: (oldVersion: number) => void) {
    if (version <= this.version) return;
    const oldVersion = this.version;
    migrate(oldVersion);
    this.version = version;
  }

  cleanup() {
    if (this.mode === "memory") this.clear();
  }

  snapshot(): PluginStorageSnapshot {
    const keys = this.keys();
    const bytes = keys.reduce((sum, key) => sum + (this.backend().getItem(this.key(key))?.length ?? 0), 0);
    return { pluginId: this.pluginId, mode: this.mode, version: this.version, keys, bytes, quotaBytes: this.quotaBytes };
  }

  private key(key: string) {
    return `${this.prefix()}${key}`;
  }

  private prefix() {
    return `sarva:plugin:${this.pluginId}:`;
  }

  private encode(value: unknown) {
    const raw = JSON.stringify({ version: this.version, value });
    return this.mode === "encrypted" ? `enc:${encodeBase64(raw)}` : raw;
  }

  private decode<T>(raw: string): T | undefined {
    const decoded = raw.startsWith("enc:") ? decodeBase64(raw.slice(4)) : raw;
    return JSON.parse(decoded).value as T;
  }

  private backend() {
    if (typeof window !== "undefined" && this.mode === "session") return storageAdapter(window.sessionStorage);
    if (typeof window !== "undefined" && (this.mode === "persistent" || this.mode === "encrypted")) return storageAdapter(window.localStorage);
    return memoryAdapter;
  }
}

class PluginStorageManager {
  namespace(pluginId: string, options: PluginStorageOptions = {}) {
    return new PluginStorageNamespace(pluginId, options.mode ?? "memory", options);
  }
}

const pluginStorageManager = new PluginStorageManager();

export function getPluginStorageManager() {
  return pluginStorageManager;
}

const memoryAdapter = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => memoryStore.set(key, value),
  removeItem: (key: string) => memoryStore.delete(key),
  keys: () => Array.from(memoryStore.keys()),
};

function storageAdapter(storage: Storage) {
  return {
    getItem: (key: string) => storage.getItem(key),
    setItem: (key: string, value: string) => storage.setItem(key, value),
    removeItem: (key: string) => storage.removeItem(key),
    keys: () => Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean) as string[],
  };
}

function encodeBase64(value: string) {
  if (typeof btoa === "function") return btoa(value);
  return Buffer.from(value, "utf8").toString("base64");
}

function decodeBase64(value: string) {
  if (typeof atob === "function") return atob(value);
  return Buffer.from(value, "base64").toString("utf8");
}
