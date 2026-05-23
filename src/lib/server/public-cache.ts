import "server-only";

type CacheEntry<T> = {
  data: T;
  freshUntil: number;
  staleUntil: number;
  inflight?: Promise<T>;
};

type CacheResult<T> = {
  data: T;
  status: "hit" | "stale" | "miss" | "refresh";
};

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_PUBLIC_LOADER_TIMEOUT_MS = 4_500;

export async function getCachedPublicData<T>(
  key: string,
  loader: () => Promise<T>,
  options: { ttlMs: number; staleMs: number; timeoutMs?: number },
): Promise<CacheResult<T>> {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.freshUntil > now) {
    return { data: existing.data, status: "hit" };
  }

  if (existing?.inflight) {
    try {
      const data = await existing.inflight;
      return { data, status: existing.data ? "refresh" : "miss" };
    } catch (error) {
      if (existing.data) return { data: existing.data, status: "stale" };
      throw error;
    }
  }

  if (existing && existing.staleUntil > now) {
    existing.inflight = refreshCacheWithDeadline(key, loader, options).finally(() => {
      const latest = cache.get(key) as CacheEntry<T> | undefined;
      if (latest) delete latest.inflight;
    });
    return { data: existing.data, status: "stale" };
  }

  const inflight = refreshCacheWithDeadline(key, loader, options).finally(() => {
    const latest = cache.get(key) as CacheEntry<T> | undefined;
    if (latest) delete latest.inflight;
  });
  cache.set(key, {
    data: existing?.data as T,
    freshUntil: 0,
    staleUntil: 0,
    inflight,
  });
  const data = await inflight;
  return { data, status: "miss" };
}

export function clearPublicCache(keyPrefix?: string) {
  if (!keyPrefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}

async function refreshCache<T>(
  key: string,
  loader: () => Promise<T>,
  options: { ttlMs: number; staleMs: number },
) {
  const data = await loader();
  const now = Date.now();
  cache.set(key, {
    data,
    freshUntil: now + options.ttlMs,
    staleUntil: now + options.ttlMs + options.staleMs,
  });
  return data;
}

function refreshCacheWithDeadline<T>(
  key: string,
  loader: () => Promise<T>,
  options: { ttlMs: number; staleMs: number; timeoutMs?: number },
) {
  return Promise.race([
    refreshCache(key, loader, options),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Public data loader timed out for ${key}`)), options.timeoutMs ?? DEFAULT_PUBLIC_LOADER_TIMEOUT_MS);
    }),
  ]);
}
