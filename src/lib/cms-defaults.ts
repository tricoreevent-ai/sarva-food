import type { CmsSettings } from "@/lib/types";

export const RESPONSIBILITY_DISCLAIMER =
  "Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. Sarva Food acts only as a technology platform connecting customers and restaurants.";

export const defaultCmsSettings: CmsSettings = {
  appName: "Sarva Food",
  disclaimer: RESPONSIBILITY_DISCLAIMER,
  homepage: {
    title: "Craving something delicious?",
    subtitle: "Order from verified nearby restaurants with live menus, quick delivery, and direct restaurant support.",
    visible: true,
  },
  banners: [
    {
      id: "homepage-arabic-grills",
      title: "Arabic flavours, made with love",
      subtitle: "Shawarma, mandi, grills, and family platters from restaurants near you.",
      imageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "Explore Arabic",
      ctaHref: "/restaurants?query=arabic",
      visible: true,
      sortOrder: 1,
    },
    {
      id: "homepage-biryani-meals",
      title: "Biryani and meals for every mood",
      subtitle: "Find dum biryani, Kerala meals, Andhra meals, and lunch combos.",
      imageUrl: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "Order now",
      ctaHref: "/restaurants?query=biryani",
      visible: true,
      sortOrder: 2,
    },
  ],
  footer: {
    visible: true,
    note: RESPONSIBILITY_DISCLAIMER,
  },
  announcements: [
    {
      id: "homepage-location-ready",
      title: "Thanisandra delivery is live",
      subtitle: "Cafe Al Arab and Falak are ready for online orders.",
      imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "See restaurants",
      ctaHref: "/restaurants?query=thanisandra",
      visible: true,
      sortOrder: 1,
    },
  ],
  sponsoredAds: [
    {
      id: "homepage-falak-offer",
      title: "Flat ₹300 off royal dinners",
      subtitle: "Use FALAK300 on Falak favourites above the minimum order.",
      imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "Use FALAK300",
      ctaHref: "/restaurant/falak-leela-bhartiya",
      visible: true,
      sortOrder: 1,
    },
  ],
  legalPages: {
    terms: RESPONSIBILITY_DISCLAIMER,
    privacy: RESPONSIBILITY_DISCLAIMER,
  },
};
