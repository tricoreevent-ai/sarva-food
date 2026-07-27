import { BRAND_CONFIG, type BrandLogoVariant } from "@/config/branding";

export type BrandSurface = "auto" | "light" | "dark" | "primary" | "accent" | "transparent" | "print" | "high-contrast";
export type BrandAssetKind = "horizontal" | "vertical" | "compact" | "icon" | "text" | "loading" | "receipt" | "invoice" | "favicon" | "notification";

export const BrandTokens = {
  name: BRAND_CONFIG.name,
  colors: BRAND_CONFIG.colors,
  fonts: BRAND_CONFIG.fonts,
  minContrast: {
    normal: 4.5,
    largeText: 3,
    icon: 3,
  },
} as const;

export const BrandAssets = {
  logos: {
    horizontal: BRAND_CONFIG.assets.logo,
    vertical: BRAND_CONFIG.assets.logoVertical,
    compact: BRAND_CONFIG.assets.logoCompact,
    text: BRAND_CONFIG.assets.logoText,
    light: BRAND_CONFIG.assets.logoLight,
    dark: BRAND_CONFIG.assets.logoDark,
    white: BRAND_CONFIG.assets.logoWhite,
    black: BRAND_CONFIG.assets.logoBlack,
    monochrome: BRAND_CONFIG.assets.logoMonochrome,
    highContrast: BRAND_CONFIG.assets.logoHighContrast,
    print: BRAND_CONFIG.assets.logoPrint,
    receipt: BRAND_CONFIG.assets.receiptLogo,
    invoice: BRAND_CONFIG.assets.invoiceLogo,
    animated: BRAND_CONFIG.assets.logoAnimated,
  },
  icons: {
    default: BRAND_CONFIG.assets.icon,
    filled: BRAND_CONFIG.assets.iconFilled,
    maskable: BRAND_CONFIG.assets.iconMaskable,
    monochrome: BRAND_CONFIG.assets.iconMonochrome,
    white: BRAND_CONFIG.assets.iconWhite,
    black: BRAND_CONFIG.assets.iconBlack,
    small: BRAND_CONFIG.assets.iconSmall,
    loading: BRAND_CONFIG.assets.loadingIcon,
    favicon: BRAND_CONFIG.assets.favicon,
    browserTab: BRAND_CONFIG.assets.browserTabIcon,
    notification: BRAND_CONFIG.assets.notificationIcon,
    notificationBadge: BRAND_CONFIG.assets.notificationBadge,
  },
  pwa: {
    apple: BRAND_CONFIG.assets.appleTouchIcon,
    android: BRAND_CONFIG.assets.androidIcon,
    androidLarge: BRAND_CONFIG.assets.androidIconLarge,
    maskable: BRAND_CONFIG.assets.maskableIcon,
    windowsTile: BRAND_CONFIG.assets.windowsTile,
    offline: BRAND_CONFIG.assets.offlineIcon,
  },
  social: {
    openGraph: BRAND_CONFIG.assets.openGraphImage,
    twitter: BRAND_CONFIG.assets.twitterImage,
  },
} as const;

export const BrandVariants = {
  lightSurface: { logo: BrandAssets.logos.highContrast, icon: BrandAssets.icons.filled },
  darkSurface: { logo: BrandAssets.logos.white, icon: BrandAssets.icons.white },
  primarySurface: { logo: BrandAssets.logos.white, icon: BrandAssets.icons.white },
  accentSurface: { logo: BrandAssets.logos.white, icon: BrandAssets.icons.white },
  printSurface: { logo: BrandAssets.logos.print, icon: BrandAssets.icons.black },
  highContrastSurface: { logo: BrandAssets.logos.highContrast, icon: BrandAssets.icons.filled },
} as const;

export function getLogo(surface: BrandSurface = "auto") {
  return getLogoForBackground(surface);
}

export function getLogoForBackground(surface: BrandSurface = "auto", kind: BrandAssetKind = "horizontal") {
  if (kind === "vertical") return surfaceNeedsLightLogo(surface) ? BrandAssets.logos.white : BrandAssets.logos.vertical;
  if (kind === "compact") return surfaceNeedsLightLogo(surface) ? BrandAssets.logos.white : BrandAssets.logos.compact;
  if (kind === "text") return surfaceNeedsLightLogo(surface) ? BRAND_CONFIG.assets.logoTextWhite : BrandAssets.logos.text;
  if (kind === "receipt") return BrandAssets.logos.receipt;
  if (kind === "invoice") return BrandAssets.logos.invoice;
  if (kind === "loading") return BrandAssets.logos.animated;
  if (kind === "icon") return getAppIcon(surface);
  if (surface === "print") return BrandVariants.printSurface.logo;
  if (surface === "high-contrast") return BrandVariants.highContrastSurface.logo;
  if (surfaceNeedsLightLogo(surface)) return BrandVariants.darkSurface.logo;
  return BrandVariants.lightSurface.logo;
}

export function getLogoVariant(variant: BrandLogoVariant, surface: BrandSurface = "auto") {
  if (variant === "light") return BrandAssets.logos.light;
  if (variant === "dark") return BrandAssets.logos.dark;
  if (variant === "monochrome") return BrandAssets.logos.monochrome;
  if (variant === "outline") return BRAND_CONFIG.assets.logoOutline;
  if (variant === "vertical") return getLogoForBackground(surface, "vertical");
  if (variant === "compact" || variant === "sidebar") return getLogoForBackground(surface, "compact");
  if (variant === "receipt") return getLogoForBackground("print", "receipt");
  if (variant === "invoice") return getLogoForBackground("print", "invoice");
  if (variant === "loading") return getLogoForBackground(surface, "loading");
  return getLogoForBackground(surface);
}

export function getAppIcon(surface: BrandSurface = "auto") {
  if (surface === "print") return BrandVariants.printSurface.icon;
  if (surfaceNeedsLightLogo(surface)) return BrandVariants.darkSurface.icon;
  return BrandVariants.lightSurface.icon;
}

export function getFavicon(size: 16 | 32 | 48 | 64 | 96 | 180 | 192 | 512 | "ico" | "svg" = "ico") {
  if (size === "ico") return BRAND_CONFIG.assets.favicon;
  if (size === "svg") return BRAND_CONFIG.assets.faviconSvg;
  if (size === 16) return BRAND_CONFIG.assets.favicon16;
  if (size === 32) return BRAND_CONFIG.assets.favicon32;
  if (size === 48) return BRAND_CONFIG.assets.favicon48;
  if (size === 64) return BRAND_CONFIG.assets.favicon64;
  if (size === 96) return BRAND_CONFIG.assets.icon96;
  if (size === 180) return BRAND_CONFIG.assets.icon180;
  if (size === 192) return BRAND_CONFIG.assets.icon192;
  return BRAND_CONFIG.assets.icon512;
}

export function getLoadingLogo(surface: BrandSurface = "auto") {
  return surfaceNeedsLightLogo(surface) ? BrandAssets.icons.white : BrandAssets.icons.loading;
}

export function getNotificationIcon() {
  return BrandAssets.icons.notification;
}

export function getBrandSurfaceTone(surface: BrandSurface = "auto") {
  if (surface === "dark" || surface === "primary" || surface === "accent") return "on-dark";
  if (surface === "print") return "print";
  return "on-light";
}

export function surfaceNeedsLightLogo(surface: BrandSurface) {
  return surface === "dark" || surface === "primary" || surface === "accent";
}

export function brandSurfaceFromCssColor(value: string, fallback: BrandSurface = "light"): BrandSurface {
  const color = parseCssColor(value);
  if (!color || color.alpha < 0.12) return fallback;
  const luminance = 0.2126 * srgb(color.red) + 0.7152 * srgb(color.green) + 0.0722 * srgb(color.blue);
  if (color.green > color.red * 1.2 && color.green > color.blue * 1.2 && luminance < 0.42) return "primary";
  if (color.red > 180 && color.green > 70 && color.green < 170 && luminance < 0.62) return "accent";
  return luminance < 0.48 ? "dark" : "light";
}

function parseCssColor(value: string) {
  const rgb = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) return null;
  const [red, green, blue, alpha = "1"] = rgb[1].split(",").map((part) => part.trim());
  return { red: Number(red), green: Number(green), blue: Number(blue), alpha: Number(alpha) };
}

function srgb(value: number) {
  const channel = Math.max(0, Math.min(255, value)) / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
