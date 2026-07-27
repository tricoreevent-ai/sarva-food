export type BrandLogoVariant =
  | "icon"
  | "horizontal"
  | "vertical"
  | "compact"
  | "sidebar"
  | "header"
  | "footer"
  | "receipt"
  | "invoice"
  | "loading"
  | "light"
  | "dark"
  | "monochrome"
  | "outline";

export const BRAND_CONFIG = {
  name: "Food Gedi",
  shortName: "Food Gedi",
  legalName: "Food Gedi",
  tagline: "Run Smarter. Serve Better.",
  browserTitle: "Food Gedi",
  metaTitle: "Food Gedi | Restaurant POS, Ordering, Kitchen, Billing and Growth OS",
  metaDescription:
    "Food Gedi helps restaurants run smarter and serve better with direct ordering, POS, kitchen operations, payments, reports, loyalty, and growth tools.",
  keywords: [
    "Food Gedi",
    "restaurant POS",
    "restaurant ordering system",
    "kitchen display system",
    "restaurant billing",
    "direct restaurant ordering",
    "restaurant operations software",
    "restaurant ERP",
  ],
  support: {
    email: "support@foodgedi.com",
    privacyEmail: "privacy@foodgedi.com",
    partnersEmail: "partners@foodgedi.com",
    website: "https://foodgedi.com",
  },
  copyright: `© Food Gedi ${new Date().getFullYear()}. All rights reserved.`,
  colors: {
    primary: "#166B2E",
    primaryDark: "#0B3F1D",
    accent: "#FF7A00",
    accentDark: "#D86100",
    background: "#FFF8F0",
    tile: "#FDF3E8",
    foreground: "#172118",
  },
  fonts: {
    sans: "Inter",
    display: "Plus Jakarta Sans",
  },
  assets: {
    logo: "/brand/food-gedi-logo.svg",
    logoLight: "/brand/food-gedi-logo-light.svg",
    logoDark: "/brand/food-gedi-logo-dark.svg",
    logoCompact: "/brand/food-gedi-logo-compact.svg",
    logoVertical: "/brand/food-gedi-logo-vertical.svg",
    logoMonochrome: "/brand/food-gedi-logo-monochrome.svg",
    logoOutline: "/brand/food-gedi-logo-outline.svg",
    logoWhite: "/brand/food-gedi-logo-white.svg",
    logoBlack: "/brand/food-gedi-logo-black.svg",
    logoHighContrast: "/brand/food-gedi-logo-high-contrast.svg",
    logoPrint: "/brand/food-gedi-logo-print.svg",
    logoText: "/brand/food-gedi-logo-text.svg",
    logoTextWhite: "/brand/food-gedi-logo-text-white.svg",
    logoSmall: "/brand/food-gedi-logo-small.svg",
    logoAnimated: "/brand/food-gedi-logo-animated.svg",
    icon: "/icons/food-gedi-icon.svg",
    iconFilled: "/icons/food-gedi-icon-filled.svg",
    iconMaskable: "/icons/food-gedi-icon-maskable.svg",
    iconMonochrome: "/icons/food-gedi-icon-monochrome.svg",
    iconWhite: "/icons/food-gedi-icon-white.svg",
    iconBlack: "/icons/food-gedi-icon-black.svg",
    iconSmall: "/icons/food-gedi-icon-small.svg",
    favicon: "/favicon.ico",
    faviconSvg: "/favicon.svg",
    favicon16: "/favicon-16x16.png",
    favicon24: "/icons/food-gedi-icon-24.png",
    favicon32: "/favicon-32x32.png",
    favicon48: "/icons/food-gedi-icon-48.png",
    favicon64: "/icons/food-gedi-icon-64.png",
    icon96: "/icons/food-gedi-icon-96.png",
    icon180: "/apple-touch-icon.png",
    icon192: "/android-chrome-192x192.png",
    icon256: "/icons/food-gedi-icon-256.png",
    icon512: "/android-chrome-512x512.png",
    icon1024: "/icons/food-gedi-icon-1024.png",
    appleTouchIcon: "/apple-touch-icon.png",
    androidIcon: "/android-chrome-192x192.png",
    androidIconLarge: "/android-chrome-512x512.png",
    maskableIcon: "/android-chrome-maskable-512.png",
    windowsTile: "/icons/food-gedi-icon-512.png",
    notificationIcon: "/android-chrome-192x192.png",
    notificationBadge: "/icons/food-gedi-icon-96.png",
    loadingIcon: "/icons/food-gedi-loading-icon.svg",
    receiptLogo: "/brand/food-gedi-logo-print.svg",
    invoiceLogo: "/brand/food-gedi-logo-print.svg",
    browserTabIcon: "/favicon.ico",
    offlineIcon: "/icons/food-gedi-icon-192.png",
    emptyStateIllustration: "/brand/food-gedi-logo-compact.svg",
    loadingIllustration: "/brand/food-gedi-logo-compact.svg",
    authIllustration: "/brand/food-gedi-logo-vertical.svg",
    dashboardIllustration: "/brand/food-gedi-logo.svg",
    openGraphImage: "/brand/food-gedi-og.png",
    twitterImage: "/brand/food-gedi-og.png",
  },
  manifest: {
    name: "Food Gedi",
    shortName: "Food Gedi",
    description:
      "Food Gedi helps restaurants run smarter and serve better with direct ordering, POS, kitchen, billing, payments, reports, loyalty, and growth tools.",
    startUrl: "/splash",
    scope: "/",
    themeColor: "#166B2E",
    backgroundColor: "#FFF8F0",
  },
} as const;

export type BrandConfig = typeof BRAND_CONFIG;
