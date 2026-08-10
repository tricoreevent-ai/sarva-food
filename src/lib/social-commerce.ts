import type { Metadata } from "next";
import { APP_NAME, ROUTES } from "@/lib/constants";
import type { MenuItem, Restaurant } from "@/lib/types";

export function parseOfferCode(value?: string | null) {
  const code = value?.trim().toUpperCase();
  return code && /^[A-Z0-9_-]{3,20}$/.test(code) ? code : undefined;
}

export function buildInstagramDeepLink(
  restaurantSlug: string,
  itemId: string,
  offerCode?: string,
) {
  return ROUTES.instagram(restaurantSlug, itemId, parseOfferCode(offerCode));
}

export function parseDeepLinkParams(input: {
  restaurantSlug?: string;
  itemId?: string;
  offer?: string;
}) {
  return {
    restaurantSlug: input.restaurantSlug ?? "",
    itemId: input.itemId ?? "",
    offerCode: parseOfferCode(input.offer),
  };
}

export function buildFoodItemMetadata(restaurant: Restaurant, item: MenuItem): Metadata {
  const title = `${item.name} from ${restaurant.name}`;
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "https://violet-squid-380447.hostingersite.com").replace(/\/$/, "");
  const path = ROUTES.item(restaurant.slug, item.id);
  const description = `${item.description || item.name} Order directly from ${restaurant.name} in your browser.`;
  const url = `${origin}${path}`;
  const image = absoluteUrl(item.image || "/images/fallback-food.svg", origin);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: APP_NAME,
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 900,
          alt: item.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

function absoluteUrl(value: string, origin: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}
