import type { CmsSettings } from "@/lib/types";
import { CMS_VERSION } from "@/config/environment/cms.config";

export const RESPONSIBILITY_DISCLAIMER =
  "Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. Sarva Food acts only as a technology platform connecting customers and restaurants.";

export const defaultCmsSettings: CmsSettings = {
  appName: "Sarva Food",
  disclaimer: RESPONSIBILITY_DISCLAIMER,
  homepage: {
    title: "Craving something delicious?",
    subtitle: "Order from verified nearby restaurants with live menus, quick delivery, and direct restaurant support.",
    visible: true,
    ctaText: "Find Food",
    ctaLink: "/restaurants",
    backgroundImage: "",
    overlayOpacity: 0.1,
    animationStyle: "float",
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
    supportEmail: "support@sarvafood.com",
    copyright: "© Sarva Food. All rights reserved.",
    socialLinks: [],
  },
  announcementBar: {
    visible: false,
    message: "",
    backgroundColor: "#fff7ed",
    icon: "bell",
    redirectUrl: "/offers",
  },
  sections: {
    categoriesVisible: true,
    offersVisible: true,
    featuredRestaurantsVisible: true,
    popularItemsVisible: true,
    recommendedTitle: "Recommended for you",
    popularTitle: "What's popular",
    offerTitle: "Today's special",
  },
  featuredRestaurants: {
    sortLogic: "rating",
    pinnedRestaurantSlugs: [],
  },
  seo: {
    title: "Sarva Food",
    description: "Order from verified nearby restaurants.",
    keywords: ["food delivery", "restaurants", "Kerala food", "Biryani"],
  },
  cmsVersion: CMS_VERSION,
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
