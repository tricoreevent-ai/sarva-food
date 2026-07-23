import { menuItemShortPath } from "@/lib/menu-item-links";

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
    const match = url.pathname.match(/^\/restaurant\/([^/]+)\/item\/([^/]+)\/?$/);
    if (!match) return originalUrlResult(normalizedUrl);
    const text = `${url.origin}${menuItemShortPath(match[1], match[2])}`;
    const result: ShortenedUrl = {
      originalUrl: normalizedUrl,
      shortUrl: text,
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
