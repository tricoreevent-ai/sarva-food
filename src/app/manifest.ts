import type { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/config/branding";

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
      { src: BRAND_CONFIG.assets.favicon, sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: BRAND_CONFIG.assets.favicon16, sizes: "16x16", type: "image/png" },
      { src: BRAND_CONFIG.assets.favicon32, sizes: "32x32", type: "image/png" },
      { src: BRAND_CONFIG.assets.appleTouchIcon, sizes: "180x180", type: "image/png", purpose: "any" },
      { src: BRAND_CONFIG.assets.androidIcon, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: BRAND_CONFIG.assets.androidIconLarge, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: BRAND_CONFIG.assets.maskableIcon, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Browse Restaurants", short_name: "Restaurants", url: "/restaurants", icons: [{ src: BRAND_CONFIG.assets.androidIcon, sizes: "192x192", type: "image/png" }] },
      { name: "Track Order", short_name: "Track", url: "/track-order", icons: [{ src: BRAND_CONFIG.assets.androidIcon, sizes: "192x192", type: "image/png" }] },
      { name: "Open Cart", short_name: "Cart", url: "/cart", icons: [{ src: BRAND_CONFIG.assets.androidIcon, sizes: "192x192", type: "image/png" }] },
      { name: "Owner POS", short_name: "POS", url: "/pos", icons: [{ src: BRAND_CONFIG.assets.androidIcon, sizes: "192x192", type: "image/png" }] },
    ],
  };
}
