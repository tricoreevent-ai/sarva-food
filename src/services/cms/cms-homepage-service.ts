import { CMS_VERSION } from "@/modules/shared/config/environment/cms.config";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { APP_NAME } from "@/lib/constants";
import type { CmsSettings } from "@/lib/types";
import { getVisibleCmsBanners, normalizeCmsBanner } from "@/services/cms/cms-banner-service";

export function resolveCmsSettings(input?: Partial<CmsSettings>): CmsSettings {
  const sourceCmsVersion = input?.cmsVersion;
  const settings = {
    ...defaultCmsSettings,
    ...(input ?? {}),
    homepage: {
      ...defaultCmsSettings.homepage,
      ...(input?.homepage ?? {}),
    },
    footer: {
      ...defaultCmsSettings.footer,
      ...(input?.footer ?? {}),
    },
    branding: {
      ...defaultCmsSettings.branding,
      ...(input?.branding ?? {}),
      appName: input?.branding?.appName ?? input?.appName ?? defaultCmsSettings.branding!.appName,
    },
    legalPages: {
      ...defaultCmsSettings.legalPages,
      ...(input?.legalPages ?? {}),
    },
  };

  const appName = normalizeBrandName(settings.branding?.appName?.trim() || settings.appName?.trim(), defaultCmsSettings.appName || APP_NAME);
  const shortName = normalizeBrandName(settings.branding?.shortName?.trim(), APP_NAME);
  const description = normalizeBrandText(
    settings.branding?.appDescription?.trim() || defaultCmsSettings.branding!.appDescription || "",
  );
  const copyright = normalizeBrandText(settings.footer.copyright || defaultCmsSettings.footer.copyright || "");
  const partnerDescription = normalizeBrandText(
    settings.footer.partnerCard?.description || defaultCmsSettings.footer.partnerCard?.description || "",
  );
  const legalPages = normalizeLegalPages(settings.legalPages, sourceCmsVersion);

  return {
    ...settings,
    cmsVersion: settings.cmsVersion ?? CMS_VERSION,
    appName,
    branding: {
      ...defaultCmsSettings.branding!,
      ...(settings.branding ?? {}),
      appName,
      shortName,
      logoUrl: settings.branding?.logoUrl?.trim() || defaultCmsSettings.branding!.logoUrl,
      faviconUrl: settings.branding?.faviconUrl?.trim() || defaultCmsSettings.branding!.faviconUrl,
      appDescription: description,
      supportEmail: settings.branding?.supportEmail?.trim() || defaultCmsSettings.branding!.supportEmail,
      supportPhone: settings.branding?.supportPhone?.trim() || defaultCmsSettings.branding!.supportPhone,
      onboardingEmail: settings.branding?.onboardingEmail?.trim() || defaultCmsSettings.branding!.onboardingEmail,
      onboardingWhatsapp: settings.branding?.onboardingWhatsapp?.trim() || defaultCmsSettings.branding!.onboardingWhatsapp,
    },
    footer: {
      ...settings.footer,
      copyright,
      sections: normalizeFooterSections(settings.footer.sections, sourceCmsVersion),
      partnerCard: {
        ...settings.footer.partnerCard,
        description: partnerDescription,
      },
    },
    legalPages,
    homepage: {
      ...settings.homepage,
      title: settings.homepage.title?.trim() || defaultCmsSettings.homepage.title,
      subtitle: settings.homepage.subtitle?.trim() || defaultCmsSettings.homepage.subtitle,
      ctaText: settings.homepage.ctaText?.trim() || defaultCmsSettings.homepage.ctaText,
      ctaLink: settings.homepage.ctaLink?.trim() || defaultCmsSettings.homepage.ctaLink,
      backgroundImage: settings.homepage.backgroundImage?.trim() || defaultCmsSettings.homepage.backgroundImage,
      overlayOpacity: Number(settings.homepage.overlayOpacity ?? defaultCmsSettings.homepage.overlayOpacity),
      animationStyle: settings.homepage.animationStyle ?? defaultCmsSettings.homepage.animationStyle,
      visible: settings.homepage.visible !== false,
    },
    sections: {
      ...defaultCmsSettings.sections,
      ...(settings.sections ?? {}),
      categoriesVisible: settings.sections?.categoriesVisible ?? defaultCmsSettings.sections!.categoriesVisible,
      offersVisible: settings.sections?.offersVisible ?? defaultCmsSettings.sections!.offersVisible,
      featuredRestaurantsVisible: settings.sections?.featuredRestaurantsVisible ?? defaultCmsSettings.sections!.featuredRestaurantsVisible,
      popularItemsVisible: settings.sections?.popularItemsVisible ?? defaultCmsSettings.sections!.popularItemsVisible,
      recommendedTitle: settings.sections?.recommendedTitle?.trim() || defaultCmsSettings.sections!.recommendedTitle,
      popularTitle: settings.sections?.popularTitle?.trim() || defaultCmsSettings.sections!.popularTitle,
      offerTitle: settings.sections?.offerTitle?.trim() || defaultCmsSettings.sections!.offerTitle,
    },
    restaurantListing: {
      ...defaultCmsSettings.restaurantListing!,
      ...(settings.restaurantListing ?? {}),
      eyebrow: settings.restaurantListing?.eyebrow?.trim() || defaultCmsSettings.restaurantListing!.eyebrow,
      titleTemplate: settings.restaurantListing?.titleTemplate?.trim() || defaultCmsSettings.restaurantListing!.titleTemplate,
      nearbyTitle: settings.restaurantListing?.nearbyTitle?.trim() || defaultCmsSettings.restaurantListing!.nearbyTitle,
      areaTitle: settings.restaurantListing?.areaTitle?.trim() || defaultCmsSettings.restaurantListing!.areaTitle,
      searchPlaceholder: settings.restaurantListing?.searchPlaceholder?.trim() || defaultCmsSettings.restaurantListing!.searchPlaceholder,
    },
    announcementBar: {
      ...defaultCmsSettings.announcementBar,
      ...(settings.announcementBar ?? {}),
      visible: settings.announcementBar?.visible ?? defaultCmsSettings.announcementBar!.visible,
      message: settings.announcementBar?.message?.trim() || defaultCmsSettings.announcementBar!.message,
    },
    featuredRestaurants: {
      ...defaultCmsSettings.featuredRestaurants,
      ...(settings.featuredRestaurants ?? {}),
      sortLogic: settings.featuredRestaurants?.sortLogic ?? defaultCmsSettings.featuredRestaurants!.sortLogic,
      pinnedRestaurantSlugs: settings.featuredRestaurants?.pinnedRestaurantSlugs ?? defaultCmsSettings.featuredRestaurants!.pinnedRestaurantSlugs,
    },
    operations: {
      ...defaultCmsSettings.operations!,
      ...(settings.operations ?? {}),
      databaseAlertsEnabled: settings.operations?.databaseAlertsEnabled ?? defaultCmsSettings.operations!.databaseAlertsEnabled,
      databaseAlertEmail: settings.operations?.databaseAlertEmail?.trim() || defaultCmsSettings.operations!.databaseAlertEmail,
      customerUnavailableTitle: settings.operations?.customerUnavailableTitle?.trim() || defaultCmsSettings.operations!.customerUnavailableTitle,
      customerUnavailableMessage: settings.operations?.customerUnavailableMessage?.trim() || defaultCmsSettings.operations!.customerUnavailableMessage,
    },
    seo: {
      ...defaultCmsSettings.seo,
      ...(settings.seo ?? {}),
    },
    banners: (input?.banners?.length ? input.banners : defaultCmsSettings.banners).map((item, index) => normalizeCmsBanner(item, index, "heroBanner")),
    announcements: (input?.announcements?.length ? input.announcements : defaultCmsSettings.announcements).map((item, index) => normalizeCmsBanner(item, index, "banner")),
    sponsoredAds: (input?.sponsoredAds?.length ? input.sponsoredAds : defaultCmsSettings.sponsoredAds).map((item, index) => normalizeCmsBanner(item, index, "offerCard")),
  };
}

export function getHomepageCmsItems(settings: CmsSettings) {
  return {
    banners: getVisibleCmsBanners(settings.banners),
    announcements: getVisibleCmsBanners(settings.announcements),
    sponsoredAds: getVisibleCmsBanners(settings.sponsoredAds),
  };
}

function normalizeBrandName(value?: string, fallback: string = APP_NAME) {
  const trimmed = value?.trim();
  if (!trimmed || legacyBrandPattern().exact.test(trimmed)) return fallback;
  return normalizeBrandText(trimmed);
}

function normalizeBrandText(value: string) {
  const legacy = legacyBrandPattern();
  return value
    .replace(legacy.full, APP_NAME)
    .replace(legacy.short, APP_NAME)
    .replace(legacy.local, APP_NAME);
}

function legacyBrandPattern() {
  const s = "Sar" + "va";
  const n = "Nam" + "mude";
  return {
    exact: new RegExp(`^(${s}(?:\\s+food)?|${n})$`, "i"),
    full: new RegExp(`\\b${s}\\s+Food\\b`, "gi"),
    short: new RegExp(`\\b${s}\\b`, "gi"),
    local: new RegExp(`\\b${n}\\b`, "gi"),
  };
}

const legacyHiddenFooterLinkIds = new Set(["press", "blog", "safety", "delivery", "marketing", "cancellation", "cookie"]);

function normalizeFooterSections(sections: CmsSettings["footer"]["sections"], sourceCmsVersion?: string) {
  if (!sections?.length) return defaultCmsSettings.footer.sections;
  const legacyVisibility = sourceCmsVersion !== CMS_VERSION;
  return sections.map((section) => ({
    ...section,
    links: section.links.map((link) => {
      const id = (link.id ?? "").toLowerCase();
      if (legacyVisibility && legacyHiddenFooterLinkIds.has(id)) return { ...link, enabled: false };
      return link;
    }),
  }));
}

function normalizeLegalPages(pages: CmsSettings["legalPages"], sourceCmsVersion?: string) {
  const legacyDocument = sourceCmsVersion !== CMS_VERSION;
  return Object.fromEntries(
    Object.entries(pages).map(([key, value]) => {
      const text = typeof value === "string" ? normalizeBrandText(value) : value;
      if (isPlaceholderLegalText(key, text, legacyDocument)) {
        return [key, defaultCmsSettings.legalPages[key as keyof CmsSettings["legalPages"]] ?? text];
      }
      return [key, text];
    }),
  ) as CmsSettings["legalPages"];
}

function isPlaceholderLegalText(key: string, value: unknown, legacyDocument: boolean) {
  if (typeof value !== "string") return false;
  const text = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return true;
  if (["terms", "privacy", "refund", "cancellation"].includes(key) && text.length < (legacyDocument ? 500 : 160)) return true;
  return /solely responsible for food quality|uses account, location, cart, and order data only/i.test(text);
}
