export const BRAND_ASSETS = {
  appIcon: "/icons/nammude-icon-512.png",
  appIconMaskable: "/icons/nammude-icon-maskable-512.png",
  favicon16: "/favicon-16x16.png",
  favicon32: "/favicon-32x32.png",
  appleTouchIcon: "/apple-touch-icon.png",
  logos: {
    english: {
      lightTheme: "/brand/nammude-logo-dark-en.png",
      darkTheme: "/brand/nammude-logo-light-en.png",
    },
    malayalam: {
      lightTheme: "/brand/nammude-logo-dark-ml.png",
      darkTheme: "/brand/nammude-logo-light-ml.png",
    },
  },
} as const;

export type BrandLogoLanguage = keyof typeof BRAND_ASSETS.logos;
