"use client";

import { CustomerShell } from "@/components/layout/customer-shell";
import { useMemo, useSyncExternalStore } from "react";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { legalContentToHtml } from "@/lib/legal-content";
import { PUBLIC_CMS_CACHE_EVENT, PUBLIC_CMS_CACHE_KEY, readCachedPublicCmsSettings } from "@/lib/public-cms-cache";
import { APP_NAME } from "@/lib/constants";
import type { CmsSettings } from "@/lib/types";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";

type LegalKey = keyof CmsSettings["legalPages"];

export function LegalPage({ title, pageKey }: { title: string; pageKey: LegalKey }) {
  const cachedSettings = useSyncExternalStore(subscribePublicCmsSettings, readCachedPublicCmsSettings, emptyPublicCmsSnapshot);
  const hydrated = useSyncExternalStore(subscribeHydration, browserHydratedSnapshot, serverHydratedSnapshot);
  const storedSettings = useAppStore((state) => state.cmsSettings) ?? defaultCmsSettings;
  const settingsSource = hydrated ? cachedSettings ?? storedSettings : defaultCmsSettings;
  const cmsSettings = useMemo(() => resolveCmsSettings(settingsSource), [settingsSource]);
  const text = cmsSettings.legalPages?.[pageKey] || defaultCmsSettings.legalPages[pageKey] || defaultCmsSettings.disclaimer;

  return (
    <CustomerShell>
      <main className="bg-[#fffaf5]">
        <section className="container-page py-8 md:py-12">
          <article className="mx-auto max-w-4xl rounded-2xl border border-orange-100 bg-white px-5 py-7 shadow-sm md:px-10 md:py-10">
            <p className="text-xs font-black uppercase text-primary">{APP_NAME} policy</p>
            <h1 className="mt-3 text-3xl font-black text-foreground md:text-5xl">{title}</h1>
            <div
              className="legal-policy-content prose prose-sm mt-7 max-w-none prose-headings:font-black prose-headings:text-foreground prose-p:leading-7 prose-li:leading-7 prose-a:font-bold prose-a:text-primary md:prose-base"
              dangerouslySetInnerHTML={{ __html: legalContentToHtml(String(text)) }}
            />
          </article>
        </section>
      </main>
    </CustomerShell>
  );
}

function subscribePublicCmsSettings(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PUBLIC_CMS_CACHE_KEY) callback();
  };
  window.addEventListener(PUBLIC_CMS_CACHE_EVENT, callback);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PUBLIC_CMS_CACHE_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function emptyPublicCmsSnapshot() {
  return null;
}

function subscribeHydration(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const id = window.setTimeout(callback, 0);
  return () => window.clearTimeout(id);
}

function browserHydratedSnapshot() {
  return true;
}

function serverHydratedSnapshot() {
  return false;
}
