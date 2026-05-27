import { CMS_VERSION } from "@/config/environment/cms.config";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import type { CmsSettings } from "@/lib/types";
import { getVisibleCmsBanners, normalizeCmsBanner } from "@/services/cms/cms-banner-service";

export function resolveCmsSettings(input?: Partial<CmsSettings>): CmsSettings {
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
    legalPages: {
      ...defaultCmsSettings.legalPages,
      ...(input?.legalPages ?? {}),
    },
  };

  return {
    ...settings,
    cmsVersion: settings.cmsVersion ?? CMS_VERSION,
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
