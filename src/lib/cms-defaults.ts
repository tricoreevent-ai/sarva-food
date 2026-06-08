import type { CmsSettings } from "@/lib/types";
import { APP_DEFAULT_TITLE, APP_DESCRIPTION, APP_NAME, APP_SEO_KEYWORDS } from "@/lib/constants";
import { CMS_VERSION } from "@/modules/shared/config/environment/cms.config";

export const RESPONSIBILITY_DISCLAIMER =
  `Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. ${APP_NAME} acts only as a technology platform connecting customers and restaurants.`;

const LEGAL_TERMS =
  `${APP_NAME} is a technology intermediary that connects customers with independent restaurants. Restaurants are solely responsible for food quality, ingredients, hygiene, allergens, preparation, packaging, pricing, safety compliance, delivery handling, and fulfilment. ${APP_NAME} does not prepare, store, inspect, or physically handle food and is not liable for contamination, restaurant misconduct, kitchen standards, or restaurant-caused delays. Payments are processed through third-party providers; ${APP_NAME} does not store card details and is not responsible for banking, UPI, gateway, or network downtime. Delivery estimates are approximate and may vary because of traffic, weather, restaurant load, rider availability, or serviceability. Refunds are reviewed after payment confirmation, restaurant validation, and issue verification, and are not automatic. Service may be affected by outages, cyber incidents, internet failures, strikes, floods, public emergencies, or other force majeure events.`;

export const defaultCmsSettings: CmsSettings = {
  appName: APP_NAME,
  branding: {
    appName: APP_NAME,
    shortName: "Nammude",
    logoUrl: "/icons/sarva-icon.svg",
    faviconUrl: "/icons/sarva-icon.svg",
    appDescription: APP_DESCRIPTION,
    supportEmail: "support@nammude.com",
    supportPhone: "",
    onboardingEmail: "partners@nammude.com",
    onboardingWhatsapp: "",
  },
  disclaimer: RESPONSIBILITY_DISCLAIMER,
  homepage: {
    title: "Connect Directly with Restaurants",
    subtitle: "Skip the middlemen and order directly from local restaurants. Browse real-time menus, access exclusive restaurant offers, schedule deliveries, and communicate directly with restaurant owners for a faster, more transparent food ordering experience.",
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
    note: "",
    supportEmail: "support@sarvafood.com",
    copyright: `© ${APP_NAME} 2026. All rights reserved.`,
    trustText: "100% Secure & Trusted Platform",
    socialLinks: [
      { id: "facebook", platform: "facebook", label: "Facebook", url: "#", enabled: true },
      { id: "instagram", platform: "instagram", label: "Instagram", url: "#", enabled: true },
      { id: "twitter", platform: "twitter", label: "X", url: "#", enabled: true },
      { id: "linkedin", platform: "linkedin", label: "LinkedIn", url: "#", enabled: true },
      { id: "youtube", platform: "youtube", label: "YouTube", url: "#", enabled: false },
    ],
    sections: [
      {
        id: "company",
        title: "Company",
        enabled: true,
        links: [
          { id: "about", label: "About Us", href: "/about", enabled: true },
          { id: "careers", label: "Careers", href: "/careers", enabled: true },
          { id: "contact", label: "Contact Us", href: "/help", enabled: true },
          { id: "press", label: "Press", href: "/press", enabled: true },
          { id: "blog", label: "Blog", href: "/blog", enabled: true },
        ],
      },
      {
        id: "customers",
        title: "Customers",
        enabled: true,
        links: [
          { id: "help", label: "Help Center", href: "/help", enabled: true },
          { id: "track", label: "Track Order", href: "/track-order", enabled: true },
          { id: "refund", label: "Refund Policy", href: "/refund-policy", enabled: true },
          { id: "safety", label: "Safety", href: "/terms", enabled: true },
          { id: "faqs", label: "FAQs", href: "/help#faqs", enabled: true },
        ],
      },
      {
        id: "owners",
        title: "Restaurant Owners",
        enabled: true,
        links: [
          { id: "register", label: "Register Restaurant", href: "/register-restaurant", enabled: true },
          { id: "owner-login", label: "Owner Login", href: "/owner/login", enabled: true },
          { id: "pos", label: "POS Features", href: "/owner/login", enabled: true },
          { id: "delivery", label: "Delivery Tools", href: "/partner-with-us", enabled: true },
          { id: "marketing", label: "Marketing Tools", href: "/partner-with-us", enabled: true },
        ],
      },
      {
        id: "legal",
        title: "Legal",
        enabled: true,
        links: [
          { id: "terms", label: "Terms & Conditions", href: "/terms", enabled: true },
          { id: "privacy", label: "Privacy Policy", href: "/privacy", enabled: true },
          { id: "refund", label: "Refund Policy", href: "/refund-policy", enabled: true },
          { id: "cancellation", label: "Cancellation Policy", href: "/cancellation-policy", enabled: true },
          { id: "cookie", label: "Cookie Policy", href: "/cookie-policy", enabled: true },
        ],
      },
    ],
    partnerCard: {
      visible: true,
      title: "Partner With Us",
      description: `Grow your restaurant business with ${APP_NAME}.`,
      primaryLabel: "Register Restaurant",
      primaryHref: "/register-restaurant",
      secondaryLabel: "Request Callback",
      secondaryHref: "/partner-with-us",
    },
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
  operations: {
    databaseAlertsEnabled: true,
    databaseAlertEmail: "",
    customerUnavailableTitle: "Restaurants are temporarily unavailable",
    customerUnavailableMessage: "Please try again in a moment. Our team is already checking the issue.",
  },
  loyalty: {
    earnPoints: 10,
    earnAmount: 100,
    redemptionPointsPerRupee: 10,
    tiers: [
      { name: "Bronze", minPoints: 0, benefits: ["Basic rewards", "Birthday offers"] },
      { name: "Silver", minPoints: 500, benefits: ["Extra reward multiplier", "Priority support", "Faster reward unlocks"] },
      { name: "Gold", minPoints: 1500, benefits: ["Premium coupons", "Free delivery benefits", "Exclusive restaurant offers", "Early access deals"] },
    ],
  },
  seo: {
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    keywords: APP_SEO_KEYWORDS,
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
  sponsoredAds: [],
  legalPages: {
    terms: LEGAL_TERMS,
    privacy: RESPONSIBILITY_DISCLAIMER,
    refund: "Refunds are reviewed after payment confirmation, restaurant validation, and issue verification. Refunds are not automatic and may be declined when order fulfilment evidence is available.",
    cancellation: "Cancellation eligibility depends on restaurant acceptance, preparation status, and dispatch status. Orders already prepared or dispatched may not be cancellable.",
    delivery: "Delivery availability, fees, distance limits, and ETA are set by each restaurant and may change based on location, weather, traffic, and operational load.",
    cookie: "Nammude uses cookies and local storage for sign-in, cart persistence, preferences, analytics, and secure application operation.",
  },
};
