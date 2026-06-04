export type ShortenedUrl = {
  originalUrl: string;
  shortUrl: string;
  provider: "tinyurl" | "original";
  ok: boolean;
  error?: string;
};

type ShortenOptions = {
  enabled?: boolean;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

const tinyUrlEndpoint = "https://tinyurl.com/api-create.php";
const shortUrlCache = new Map<string, ShortenedUrl>();

export async function shortenUrl(originalUrl: string, options: ShortenOptions = {}): Promise<ShortenedUrl> {
  const normalizedUrl = originalUrl.trim();
  const enabled = options.enabled ?? true;

  if (!enabled || !isHttpUrl(normalizedUrl)) {
    return originalUrlResult(normalizedUrl);
  }

  const cached = shortUrlCache.get(normalizedUrl);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 4500);

  try {
    const fetcher = options.fetcher ?? fetch;
    const response = await fetcher(`${tinyUrlEndpoint}?url=${encodeURIComponent(normalizedUrl)}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    const text = (await response.text()).trim();

    if (!response.ok || !isHttpUrl(text)) {
      throw new Error(text || `TinyURL returned ${response.status}.`);
    }

    const result: ShortenedUrl = {
      originalUrl: normalizedUrl,
      shortUrl: text,
      provider: "tinyurl",
      ok: true,
    };
    shortUrlCache.set(normalizedUrl, result);
    return result;
  } catch (error) {
    return {
      ...originalUrlResult(normalizedUrl),
      error: error instanceof Error ? error.message : "TinyURL failed.",
    };
  } finally {
    clearTimeout(timeout);
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
