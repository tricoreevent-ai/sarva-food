import { BrandAssets, getAppIcon, getFavicon, getLogoForBackground } from "@/lib/brand-system";

export const BRAND_ASSETS = {
  appIcon: getAppIcon("light"),
  appIconMaskable: BrandAssets.pwa.maskable,
  favicon16: getFavicon(16),
  favicon32: getFavicon(32),
  appleTouchIcon: BrandAssets.pwa.apple,
  primaryLogo: getLogoForBackground("light"),
  logoCard: getLogoForBackground("light", "compact"),
  logoSticker: getAppIcon("light"),
  logos: {
    english: {
      lightTheme: getLogoForBackground("light"),
      darkTheme: getLogoForBackground("dark"),
    },
    malayalam: {
      lightTheme: getLogoForBackground("light"),
      darkTheme: getLogoForBackground("dark"),
    },
  },
} as const;

export type BrandLogoLanguage = keyof typeof BRAND_ASSETS.logos;
