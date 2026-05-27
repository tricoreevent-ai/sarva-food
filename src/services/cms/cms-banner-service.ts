import { CMS_IMAGE_PRESETS } from "@/config/environment/cms.config";
import type { CmsBanner } from "@/lib/types";

export type CmsImagePreset = keyof typeof CMS_IMAGE_PRESETS;

export function optimizeCmsImageUrl(url?: string, preset: CmsImagePreset = "banner") {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const transform = CMS_IMAGE_PRESETS[preset].transform;
  if (url.includes("/upload/f_auto") || url.includes("/upload/q_auto") || /\/upload\/[^/]*q_auto/.test(url)) return url;
  return url.replace("/upload/", `/upload/${transform}/`);
}

export function normalizeCmsBanner(item: CmsBanner, index: number, preset: CmsImagePreset = "banner"): CmsBanner {
  return {
    ...item,
    id: item.id || `cms-${Date.now()}-${index}`,
    title: item.title.trim(),
    subtitle: item.subtitle?.trim() ?? "",
    imageUrl: optimizeCmsImageUrl(item.imageUrl.trim(), preset),
    mobileImageUrl: optimizeCmsImageUrl(item.mobileImageUrl?.trim(), "mobileBanner"),
    ctaLabel: item.ctaLabel?.trim() ?? "",
    ctaHref: item.ctaHref?.trim() ?? "",
    visible: item.visible !== false,
    sortOrder: Number(item.sortOrder) || index + 1,
  };
}

export function getVisibleCmsBanners(items: CmsBanner[] = []) {
  const now = Date.now();
  return items
    .filter((item) => {
      if (item.visible === false) return false;
      if (item.publishFrom && Date.parse(item.publishFrom) > now) return false;
      if (item.publishTo && Date.parse(item.publishTo) < now) return false;
      return Boolean(item.title?.trim());
    })
    .sort((first, second) => first.sortOrder - second.sortOrder);
}

