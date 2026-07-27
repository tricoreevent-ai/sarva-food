import { BRAND_CONFIG } from "@/config/branding";

export const BRAND_ASSETS = {
  appIcon: BRAND_CONFIG.assets.icon,
  appIconMaskable: BRAND_CONFIG.assets.maskableIcon,
  favicon16: BRAND_CONFIG.assets.favicon16,
  favicon32: BRAND_CONFIG.assets.favicon32,
  appleTouchIcon: BRAND_CONFIG.assets.appleTouchIcon,
  primaryLogo: BRAND_CONFIG.assets.logo,
  logoCard: BRAND_CONFIG.assets.logoCompact,
  logoSticker: BRAND_CONFIG.assets.icon,
  logos: {
    english: {
      lightTheme: BRAND_CONFIG.assets.logoLight,
      darkTheme: BRAND_CONFIG.assets.logoDark,
    },
    malayalam: {
      lightTheme: BRAND_CONFIG.assets.logoLight,
      darkTheme: BRAND_CONFIG.assets.logoDark,
    },
  },
} as const;

export type BrandLogoLanguage = keyof typeof BRAND_ASSETS.logos;
