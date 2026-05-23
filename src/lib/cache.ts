type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const STORAGE_PREFIX = "sarva-cache:";

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt >= Date.now()) {
    return entry.value as T;
  }
  if (entry) {
    memoryCache.delete(key);
  }

  const persisted = readPersisted<T>(key);
  if (persisted) {
    memoryCache.set(key, persisted);
    return persisted.value;
  }

  return null;
}

export function setCached<T>(key: string, value: T, ttlMs: number, persist = false) {
  const entry = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
  memoryCache.set(key, entry);

  if (persist) {
    writePersisted(key, entry);
  }
}

export function invalidateCache(prefix: string) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(`${STORAGE_PREFIX}${prefix}`))
    .forEach((key) => window.localStorage.removeItem(key));
}

export async function readThroughCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options?: { persist?: boolean },
) {
  const cached = getCached<T>(key);
  if (cached) return cached;
  const value = await loader();
  setCached(key, value, ttlMs, options?.persist);
  return value;
}

function readPersisted<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.expiresAt < Date.now()) {
      window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writePersisted<T>(key: string, entry: CacheEntry<T>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Storage can be full or disabled. Memory cache still keeps the UI fast.
  }
}
