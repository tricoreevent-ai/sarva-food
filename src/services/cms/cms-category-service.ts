import { optimizeCmsImageUrl } from "@/services/cms/cms-banner-service";
import type { AppCategory } from "@/lib/types";

export function resolveHomepageCategories(categories: AppCategory[], visibleIds?: string[]) {
  const allowed = visibleIds?.length ? new Set(visibleIds) : null;
  return categories
    .filter((category) => category.active && (!allowed || allowed.has(category.id) || allowed.has(category.slug)))
    .map((category) => ({
      ...category,
      image: optimizeCmsImageUrl(category.image, "categoryIcon"),
    }))
    .sort((first, second) => first.sortOrder - second.sortOrder);
}

