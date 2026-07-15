export const CMS_VERSION = "2026.06.cms-v3";

export const CMS_COLLECTIONS = {
  systemSettings: "appSettings",
  cmsDocumentId: "cms",
  homepage: "cms_homepage",
  homepageBanners: "homepage_banners",
  foodCategories: "appCategories",
  cuisineTypes: "appCuisines",
  legacyFoodCategories: "food_categories",
  legacyCuisineTypes: "cuisine_types",
} as const;

export const REQUIRED_CMS_FIELDS = [
  "appName",
  "homepage.title",
  "homepage.subtitle",
  "homepage.visible",
  "banners",
  "announcements",
  "sponsoredAds",
  "footer.visible",
  "footer.note",
  "legalPages.terms",
  "legalPages.privacy",
] as const;

export const CMS_IMAGE_PRESETS = {
  heroBanner: { aspectRatio: 16 / 6, transform: "c_fill,ar_16:6,w_1920,q_auto:good,f_auto,dpr_auto" },
  banner: { aspectRatio: 16 / 9, transform: "c_fill,ar_16:9,w_1400,q_auto,f_auto,dpr_auto" },
  offerCard: { aspectRatio: 4 / 3, transform: "c_fill,ar_4:3,w_900,q_auto,f_auto,dpr_auto" },
  categoryIcon: { aspectRatio: 1, transform: "c_fill,ar_1:1,w_320,q_auto:eco,f_auto,dpr_auto" },
  mobileBanner: { aspectRatio: 4 / 5, transform: "c_fill,ar_4:5,w_800,q_auto,f_auto,dpr_auto" },
} as const;
