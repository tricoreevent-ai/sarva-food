import "server-only";

import { classifyFirestoreError } from "@/lib/server/firestore-error-classifier";
import { getCachedPublicData } from "@/lib/server/public-cache";

export const PUBLIC_CATALOG_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
  "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
  "Surrogate-Control": "max-age=300, stale-while-revalidate=3600",
};

export const PUBLIC_REVIEW_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=900",
  "CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=900",
  "Surrogate-Control": "max-age=120, stale-while-revalidate=900",
};

export function publicCacheOptions(ttlMs = 5 * 60 * 1000, staleMs = 6 * 60 * 60 * 1000) {
  return { ttlMs, staleMs, timeoutMs: 8_000 };
}

export async function getCachedPublicApiData<T>(key: string, loader: () => Promise<T>, ttlMs?: number) {
  return getCachedPublicData(key, loader, publicCacheOptions(ttlMs));
}

export function publicDataFailurePayload(error: unknown) {
  const failure = classifyFirestoreError(error);
  return {
    status: failure.kind === "quota_exceeded" || failure.retryable ? 503 : 500,
    body: {
      data: [],
      error: failure.publicMessage,
      meta: {
        dependency: "firestore",
        issue: failure.issue,
        retryable: failure.retryable,
      },
    },
  };
}
