import { defaultCmsSettings } from "@/lib/cms-defaults";
import type { CmsSettings } from "@/lib/types";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";

export const PUBLIC_CMS_CACHE_KEY = "sarva-public-cms-cache:v2";

export function readCachedPublicCmsSettings(): CmsSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PUBLIC_CMS_CACHE_KEY);
    if (!raw) return null;
    return resolveCmsSettings(JSON.parse(raw) as Partial<CmsSettings>);
  } catch {
    return null;
  }
}

export function writeCachedPublicCmsSettings(settings: CmsSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PUBLIC_CMS_CACHE_KEY, JSON.stringify(resolveCmsSettings(settings)));
  } catch {
    // CMS cache is only used to reduce visible branding flicker.
  }
}

export function initialPublicCmsSettings() {
  return readCachedPublicCmsSettings() ?? defaultCmsSettings;
}
