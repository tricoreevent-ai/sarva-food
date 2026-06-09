import { defaultCmsSettings } from "@/lib/cms-defaults";
import type { CmsSettings } from "@/lib/types";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";

export const PUBLIC_CMS_CACHE_KEY = "sarva-public-cms-cache:v3";
export const PUBLIC_CMS_CACHE_EVENT = "sarva-public-cms-cache-updated";

let cachedRawCmsSettings: string | null | undefined;
let cachedResolvedCmsSettings: CmsSettings | null = null;

export function readCachedPublicCmsSettings(): CmsSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PUBLIC_CMS_CACHE_KEY);
    if (raw === cachedRawCmsSettings) return cachedResolvedCmsSettings;
    cachedRawCmsSettings = raw;
    if (!raw) {
      cachedResolvedCmsSettings = null;
      return null;
    }
    cachedResolvedCmsSettings = resolveCmsSettings(JSON.parse(raw) as Partial<CmsSettings>);
    return cachedResolvedCmsSettings;
  } catch {
    cachedRawCmsSettings = undefined;
    cachedResolvedCmsSettings = null;
    return null;
  }
}

export function writeCachedPublicCmsSettings(settings: CmsSettings) {
  if (typeof window === "undefined") return;
  try {
    const resolved = resolveCmsSettings(settings);
    cachedResolvedCmsSettings = resolved;
    cachedRawCmsSettings = JSON.stringify(resolved);
    window.localStorage.setItem(PUBLIC_CMS_CACHE_KEY, cachedRawCmsSettings);
    window.dispatchEvent(new Event(PUBLIC_CMS_CACHE_EVENT));
  } catch {
    // CMS cache is only used to reduce visible branding flicker.
  }
}

export function initialPublicCmsSettings() {
  return readCachedPublicCmsSettings() ?? defaultCmsSettings;
}
