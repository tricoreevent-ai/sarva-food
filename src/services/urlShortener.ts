export type ShortenedUrl = {
  originalUrl: string;
  shortUrl: string;
  provider: "internal" | "original";
  ok: boolean;
  error?: string;
};

type ShortenOptions = {
  enabled?: boolean;
};

const shortUrlCache = new Map<string, ShortenedUrl>();

export async function shortenUrl(originalUrl: string, options: ShortenOptions = {}): Promise<ShortenedUrl> {
  const normalizedUrl = originalUrl.trim();
  const enabled = options.enabled ?? true;

  if (!enabled || !isHttpUrl(normalizedUrl)) {
    return originalUrlResult(normalizedUrl);
  }

  const cached = shortUrlCache.get(normalizedUrl);
  if (cached) return cached;

  try {
    const url = new URL(normalizedUrl);
    const match = url.pathname.match(/^\/restaurant\/([^/]+)\/(?:item|menu)\/([^/]+)\/?$/);
    if (!match) return originalUrlResult(normalizedUrl);
    const response = await fetch("/api/owner/short-links", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ restaurantId: decodeURIComponent(match[1]), targetPath: url.pathname, kind: "item" }) });
    const payload = await response.json().catch(() => ({})) as { data?: { shortUrl?: string }; error?: string };
    if (!response.ok || !payload.data?.shortUrl) throw new Error(payload.error || "Smart link service is temporarily unavailable.");
    const result: ShortenedUrl = {
      originalUrl: normalizedUrl,
      shortUrl: payload.data.shortUrl,
      provider: "internal",
      ok: true,
    };
    shortUrlCache.set(normalizedUrl, result);
    return result;
  } catch {
    return originalUrlResult(normalizedUrl);
  }
}

function originalUrlResult(originalUrl: string): ShortenedUrl {
  return {
    originalUrl,
    shortUrl: originalUrl,
    provider: "original",
    ok: false,
  };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
