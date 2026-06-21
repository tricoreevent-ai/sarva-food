export const BRAND_ASSETS = {
  appIcon: "/brand/nammude-logo-sticker.png",
  appIconMaskable: "/icons/nammude-icon-maskable-512.png",
  favicon16: "/favicon-16x16.png",
  favicon32: "/favicon-32x32.png",
  appleTouchIcon: "/apple-touch-icon.png",
  primaryLogo: "/brand/nammude-logo-full.png",
  logoCard: "/brand/nammude-logo-card.png",
  logoSticker: "/brand/nammude-logo-sticker.png",
  logos: {
    english: {
      lightTheme: "/brand/nammude-logo-full.png",
      darkTheme: "/brand/nammude-logo-full.png",
    },
    malayalam: {
      lightTheme: "/brand/nammude-logo-full.png",
      darkTheme: "/brand/nammude-logo-full.png",
    },
  },
} as const;

export type BrandLogoLanguage = keyof typeof BRAND_ASSETS.logos;
