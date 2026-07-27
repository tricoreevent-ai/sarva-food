"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { BRAND_CONFIG } from "@/config/branding";
import { BrandAssets, BrandTokens, BrandVariants, getAppIcon, getBrandSurfaceTone, getFavicon, getLoadingLogo, getLogo, getLogoForBackground, getLogoVariant, type BrandSurface } from "@/lib/brand-system";

type BrandContextValue = {
  config: typeof BRAND_CONFIG;
  surface: BrandSurface;
  assets: typeof BrandAssets;
  tokens: typeof BrandTokens;
  variants: typeof BrandVariants;
  helpers: {
    getLogo: typeof getLogo;
    getLogoForBackground: typeof getLogoForBackground;
    getLogoVariant: typeof getLogoVariant;
    getAppIcon: typeof getAppIcon;
    getFavicon: typeof getFavicon;
    getLoadingLogo: typeof getLoadingLogo;
    getBrandSurfaceTone: typeof getBrandSurfaceTone;
  };
};

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({ children, surface = "auto" }: { children: ReactNode; surface?: BrandSurface }) {
  const value = useMemo<BrandContextValue>(() => ({
    config: BRAND_CONFIG,
    surface,
    assets: BrandAssets,
    tokens: BrandTokens,
    variants: BrandVariants,
    helpers: { getLogo, getLogoForBackground, getLogoVariant, getAppIcon, getFavicon, getLoadingLogo, getBrandSurfaceTone },
  }), [surface]);

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext) ?? {
    config: BRAND_CONFIG,
    surface: "auto" as BrandSurface,
    assets: BrandAssets,
    tokens: BrandTokens,
    variants: BrandVariants,
    helpers: { getLogo, getLogoForBackground, getLogoVariant, getAppIcon, getFavicon, getLoadingLogo, getBrandSurfaceTone },
  };
}
