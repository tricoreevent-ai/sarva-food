"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Building2, ChevronDown, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { APP_DESCRIPTION } from "@/lib/constants";
import { PUBLIC_CMS_CACHE_EVENT, PUBLIC_CMS_CACHE_KEY, readCachedPublicCmsSettings } from "@/lib/public-cms-cache";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";
import type { CmsSettings } from "@/lib/types";

type FooterSection = NonNullable<CmsSettings["footer"]["sections"]>[number];
type FooterLink = FooterSection["links"][number];

export function CustomerFooter() {
  const cachedSettings = useSyncExternalStore(subscribePublicCmsSettings, readCachedPublicCmsSettings, emptyPublicCmsSnapshot);
  const hydrated = useSyncExternalStore(subscribeHydration, browserHydratedSnapshot, serverHydratedSnapshot);
  const storedSettings = useAppStore((state) => state.cmsSettings) ?? defaultCmsSettings;
  const settingsSource = hydrated ? cachedSettings ?? storedSettings : defaultCmsSettings;
  const cmsSettings = useMemo(
    () => resolveCmsSettings(settingsSource),
    [settingsSource],
  );

  if (cmsSettings.footer?.visible === false) return null;

  const branding = cmsSettings.branding ?? defaultCmsSettings.branding!;
  const appName = branding.appName || cmsSettings.appName || defaultCmsSettings.appName || "Nammude";
  const sections = footerSections(cmsSettings);
  const partnerCard = { ...defaultCmsSettings.footer.partnerCard, ...(cmsSettings.footer.partnerCard ?? {}) };
  const socialLinks = footerSocialLinks(cmsSettings);
  const legalLinks = footerLegalLinks(sections);

  return (
    <footer className="border-t border-orange-100 bg-white">
      <div className="container-page grid gap-8 py-9 lg:grid-cols-[minmax(180px,260px)_1fr_360px] xl:grid-cols-[minmax(210px,300px)_1fr_400px]">
        <section>
          <div className="flex items-start gap-3">
            <div>
              <BrandLogo className="h-12 w-44" sizes="176px" />
              <p className="mt-1 max-w-48 text-sm font-semibold leading-6 text-muted-foreground">
                {branding.appDescription || APP_DESCRIPTION}
              </p>
            </div>
          </div>
          {socialLinks.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.id ?? link.label}
                  href={link.url}
                  target={isExternalHref(link.url) ? "_blank" : undefined}
                  rel={isExternalHref(link.url) ? "noreferrer" : undefined}
                  aria-label={link.label}
                  title={link.label}
                  className="grid size-11 place-items-center rounded-full bg-orange-50 text-sm font-black text-foreground transition hover:bg-primary hover:text-white"
                >
                  {socialLabel(link.platform ?? link.label)}
                </a>
              ))}
            </div>
          ) : null}
        </section>

        <section className="hidden gap-6 md:grid md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <FooterColumn key={section.id} section={section} />
          ))}
        </section>

        <section className="grid gap-2 md:hidden">
          {sections.map((section) => (
            <FooterAccordion key={section.id} section={section} />
          ))}
        </section>

        {partnerCard.visible === false ? null : (
          <section className="rounded-xl border border-orange-100 bg-orange-50/50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm">
                <Building2 className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-black">{partnerCard.title || "Partner With Us"}</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
                  {partnerCard.description || `Grow your restaurant business with ${appName}.`}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {partnerCard.primaryHref ? (
                <Button asChild>
                  <Link href={partnerCard.primaryHref}>{partnerCard.primaryLabel || "Register Restaurant"}</Link>
                </Button>
              ) : null}
              {partnerCard.secondaryHref ? (
                <Button asChild variant="outline">
                  <Link href={partnerCard.secondaryHref}>{partnerCard.secondaryLabel || "Request Callback"}</Link>
                </Button>
              ) : null}
            </div>
          </section>
        )}
      </div>

      <div className="border-t border-orange-100">
        <div className="container-page flex flex-col gap-4 py-5 text-sm font-semibold text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            {cmsSettings.footer.trustText || defaultCmsSettings.footer.trustText}
          </p>
          <p className="text-center">{cmsSettings.footer.copyright || defaultCmsSettings.footer.copyright}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ section }: { section: FooterSection }) {
  const links = section.links.filter((link) => link.enabled !== false);
  return (
    <div>
      <h3 className="text-sm font-black uppercase">{section.title}</h3>
      <span className="mt-3 block h-0.5 w-8 rounded-full bg-primary" />
      <div className="mt-5 grid gap-3">
        {links.map((link) => (
          <FooterNavLink key={link.id ?? link.href + link.label} link={link} />
        ))}
      </div>
    </div>
  );
}

function FooterAccordion({ section }: { section: FooterSection }) {
  const links = section.links.filter((link) => link.enabled !== false);
  return (
    <details className="rounded-xl border border-orange-100 bg-white px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black uppercase">
        {section.title}
        <ChevronDown className="size-4" />
      </summary>
      <div className="mt-4 grid gap-3">
        {links.map((link) => (
          <FooterNavLink key={link.id ?? link.href + link.label} link={link} />
        ))}
      </div>
    </details>
  );
}

function FooterNavLink({ link }: { link: FooterLink }) {
  return (
    <Link
      href={link.href}
      target={link.openInNewTab || isExternalHref(link.href) ? "_blank" : undefined}
      rel={link.openInNewTab || isExternalHref(link.href) ? "noreferrer" : undefined}
      className="text-sm font-semibold text-muted-foreground hover:text-primary"
    >
      {link.label}
    </Link>
  );
}

function footerSections(settings: CmsSettings) {
  const configured = settings.footer.sections?.length ? settings.footer.sections : defaultCmsSettings.footer.sections ?? [];
  return configured
    .filter((section) => section.enabled !== false)
    .map((section) => ({ ...section, links: section.links.filter((link) => link.enabled !== false) }));
}

function footerSocialLinks(settings: CmsSettings) {
  const configured = settings.footer.socialLinks?.length ? settings.footer.socialLinks : defaultCmsSettings.footer.socialLinks ?? [];
  return configured.filter((link) => link.enabled !== false && Boolean(link.url?.trim()));
}

function footerLegalLinks(sections: FooterSection[]) {
  const legal = sections.find((section) => section.id === "legal");
  const source = legal?.links.length ? legal.links : defaultCmsSettings.footer.sections?.find((section) => section.id === "legal")?.links ?? [];
  return source.filter((link) => ["privacy", "terms", "cookie"].includes(link.id ?? "") || ["Privacy Policy", "Terms & Conditions", "Cookie Policy"].includes(link.label));
}

function socialLabel(value: string) {
  const key = value.toLowerCase();
  if (key.includes("facebook")) return "f";
  if (key.includes("instagram")) return "ig";
  if (key.includes("twitter") || key === "x") return "x";
  if (key.includes("linkedin")) return "in";
  if (key.includes("youtube")) return "yt";
  return value.slice(0, 2).toLowerCase();
}

function isExternalHref(href?: string) {
  return Boolean(href && /^https?:\/\//i.test(href));
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

function emptyPublicCmsSnapshot(): CmsSettings | null {
  return null;
}

function subscribeHydration() {
  return () => undefined;
}

function browserHydratedSnapshot() {
  return true;
}

function serverHydratedSnapshot() {
  return false;
}
