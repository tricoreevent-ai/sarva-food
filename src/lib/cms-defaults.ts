import type { CmsSettings } from "@/lib/types";
import { CMS_VERSION } from "@/config/environment/cms.config";

export const RESPONSIBILITY_DISCLAIMER =
  "Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. Sarva Food acts only as a technology platform connecting customers and restaurants.";

const LEGAL_TERMS =
  "Sarva Food is a technology intermediary that connects customers with independent restaurants. Restaurants are solely responsible for food quality, ingredients, hygiene, allergens, preparation, packaging, pricing, safety compliance, delivery handling, and fulfilment. Sarva Food does not prepare, store, inspect, or physically handle food and is not liable for contamination, restaurant misconduct, kitchen standards, or restaurant-caused delays. Payments are processed through third-party providers; Sarva Food does not store card details and is not responsible for banking, UPI, gateway, or network downtime. Delivery estimates are approximate and may vary because of traffic, weather, restaurant load, rider availability, or serviceability. Refunds are reviewed after payment confirmation, restaurant validation, and issue verification, and are not automatic. Service may be affected by outages, cyber incidents, internet failures, strikes, floods, public emergencies, or other force majeure events.";

export const defaultCmsSettings: CmsSettings = {
  appName: "Sarva Food",
  branding: {
    appName: "Sarva Food",
    shortName: "Sarva",
    logoUrl: "/icons/sarva-icon.svg",
    faviconUrl: "/icons/sarva-icon.svg",
    appDescription: "Order from verified nearby restaurants.",
    supportEmail: "support@sarvafood.com",
    supportPhone: "",
    onboardingEmail: "partners@sarvafood.com",
    onboardingWhatsapp: "",
  },
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
  restaurantListing: {
    eyebrow: "Restaurants delivering near you",
    titleTemplate: "{count} {mode}",
    nearbyTitle: "Restaurants delivering near you",
    areaTitle: "Restaurants around this area",
    searchPlaceholder: "Search restaurants, cuisines, offers, or dishes",
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
      subtitle: "Cafe Al Arab UL and Falak are ready for online orders.",
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
    terms: LEGAL_TERMS,
    privacy: RESPONSIBILITY_DISCLAIMER,
    refund: "Refunds are reviewed after payment confirmation, restaurant validation, and issue verification. Refunds are not automatic and may be declined when order fulfilment evidence is available.",
    cancellation: "Cancellation eligibility depends on restaurant acceptance, preparation status, and dispatch status. Orders already prepared or dispatched may not be cancellable.",
    delivery: "Delivery availability, fees, distance limits, and ETA are set by each restaurant and may change based on location, weather, traffic, and operational load.",
    cookie: "Sarva Food uses cookies and local storage for sign-in, cart persistence, preferences, analytics, and secure application operation.",
  },
};
