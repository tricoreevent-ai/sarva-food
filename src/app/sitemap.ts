import type { MetadataRoute } from "next";
import { getPublicRestaurantDocs } from "@/lib/server/public-firestore";
import { ROUTES } from "@/lib/constants";
import { getRequestPublicAppUrl } from "@/lib/server/public-app-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getRequestPublicAppUrl();
  const staticRoutes = ["", "/restaurants", "/offers", "/catering"];
  const now = new Date();
  const restaurantRoutes = await getRestaurantSitemapRoutes(baseUrl, now);

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: route === "" ? 1 : 0.7,
    } satisfies MetadataRoute.Sitemap[number])),
    ...restaurantRoutes,
  ];
}

async function getRestaurantSitemapRoutes(baseUrl: string, now: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const restaurants = await getPublicRestaurantDocs();
    return restaurants.map((restaurant) => ({
      url: `${baseUrl}${ROUTES.restaurant(restaurant.slug || restaurant.id)}`,
      lastModified: parseDate(restaurant.updatedAt) ?? now,
      changeFrequency: "daily",
      priority: 0.85,
    }));
  } catch {
    return [];
  }
}

function parseDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
