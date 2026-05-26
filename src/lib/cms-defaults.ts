import type { CmsSettings } from "@/lib/types";

export const RESPONSIBILITY_DISCLAIMER =
  "Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. Sarva Food acts only as a technology platform connecting customers and restaurants.";

export const defaultCmsSettings: CmsSettings = {
  appName: "Sarva Food",
  disclaimer: RESPONSIBILITY_DISCLAIMER,
  homepage: {
    title: "",
    subtitle: "",
    visible: false,
  },
  banners: [],
  footer: {
    visible: true,
    note: RESPONSIBILITY_DISCLAIMER,
  },
  announcements: [],
  sponsoredAds: [],
  legalPages: {
    terms: RESPONSIBILITY_DISCLAIMER,
    privacy: RESPONSIBILITY_DISCLAIMER,
  },
};
