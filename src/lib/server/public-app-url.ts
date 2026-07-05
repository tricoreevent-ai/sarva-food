import { headers } from "next/headers";

const FALLBACK_PUBLIC_APP_URL = "https://violet-squid-380447.hostingersite.com";

export function getConfiguredPublicAppUrl() {
  return normalizePublicAppUrl(process.env.NEXT_PUBLIC_APP_URL) ?? FALLBACK_PUBLIC_APP_URL;
}

export async function getRequestPublicAppUrl() {
  const configuredUrl = normalizePublicAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredUrl) return configuredUrl;

  const headerStore = await headers();
  const host = firstHeaderValue(headerStore.get("x-forwarded-host")) ?? firstHeaderValue(headerStore.get("host"));
  if (!host || isLocalHost(host)) return FALLBACK_PUBLIC_APP_URL;

  const proto = firstHeaderValue(headerStore.get("x-forwarded-proto")) === "http" ? "http" : "https";
  return `${proto}://${host}`;
}

function normalizePublicAppUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || isLocalHost(url.host)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function isLocalHost(host: string) {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}
