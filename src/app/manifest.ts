import type { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/config/branding";
import { BrandAssets, getFavicon } from "@/lib/brand-system";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_CONFIG.manifest.name,
    short_name: BRAND_CONFIG.manifest.shortName,
    description: BRAND_CONFIG.manifest.description,
    start_url: BRAND_CONFIG.manifest.startUrl,
    scope: BRAND_CONFIG.manifest.scope,
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    orientation: "portrait-primary",
    background_color: BRAND_CONFIG.manifest.backgroundColor,
    theme_color: BRAND_CONFIG.manifest.themeColor,
    categories: ["food", "shopping", "business"],
    icons: [
      { src: getFavicon("ico"), sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: getFavicon(16), sizes: "16x16", type: "image/png" },
      { src: getFavicon(32), sizes: "32x32", type: "image/png" },
      { src: BrandAssets.pwa.apple, sizes: "180x180", type: "image/png", purpose: "any" },
      { src: BrandAssets.pwa.android, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: BrandAssets.pwa.androidLarge, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: BrandAssets.pwa.maskable, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Browse Restaurants", short_name: "Restaurants", url: "/restaurants", icons: [{ src: BrandAssets.pwa.android, sizes: "192x192", type: "image/png" }] },
      { name: "Track Order", short_name: "Track", url: "/track-order", icons: [{ src: BrandAssets.pwa.android, sizes: "192x192", type: "image/png" }] },
      { name: "Open Cart", short_name: "Cart", url: "/cart", icons: [{ src: BrandAssets.pwa.android, sizes: "192x192", type: "image/png" }] },
      { name: "Owner POS", short_name: "POS", url: "/pos", icons: [{ src: BrandAssets.pwa.android, sizes: "192x192", type: "image/png" }] },
    ],
  };
}
