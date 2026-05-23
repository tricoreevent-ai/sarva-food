import type { MenuItem } from "@/lib/types";

export type RecommendationContext = {
  restaurantSlug: string;
  city?: string;
  language?: string;
  recentItemIds?: string[];
};

export async function getMenuRecommendations(
  items: MenuItem[],
  context: RecommendationContext,
) {
  // Future scale hook: replace with a Cloud Function backed by analytics,
  // language preferences, availability, and optional AI ranking.
  const popular = items.filter((item) => item.restaurantSlug === context.restaurantSlug && item.isPopular);
  return popular.length ? popular.slice(0, 6) : items.slice(0, 6);
}
