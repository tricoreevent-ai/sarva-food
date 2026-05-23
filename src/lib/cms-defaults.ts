import type { CmsSettings } from "@/lib/types";

export const RESPONSIBILITY_DISCLAIMER =
  "Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. Sarva Food acts only as a technology platform connecting customers and restaurants.";

export const defaultCmsSettings: CmsSettings = {
  disclaimer: RESPONSIBILITY_DISCLAIMER,
  homepage: {
    title: "Fresh food, delivered fast",
    subtitle: "Discover restaurants, scheduled orders, catering, and local offers in one place.",
    visible: true,
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
