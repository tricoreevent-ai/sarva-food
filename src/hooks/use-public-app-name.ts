"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { PUBLIC_CMS_CACHE_EVENT, initialPublicCmsSettings, readCachedPublicCmsSettings } from "@/lib/public-cms-cache";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";

export function usePublicAppName() {
  const cachedSettings = useSyncExternalStore(subscribePublicCmsSettings, readCachedPublicCmsSettings, initialPublicCmsSettings);
  const storedSettings = useAppStore((state) => state.cmsSettings) ?? defaultCmsSettings;
  return useMemo(() => {
    const settings = resolveCmsSettings(cachedSettings ?? storedSettings ?? defaultCmsSettings);
    return settings.branding?.appName?.trim() || settings.appName?.trim() || defaultCmsSettings.branding!.appName;
  }, [cachedSettings, storedSettings]);
}

function subscribePublicCmsSettings(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(PUBLIC_CMS_CACHE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PUBLIC_CMS_CACHE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
