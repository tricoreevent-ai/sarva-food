import { FoodItemDetailFlow } from "@/components/flows/food-item-detail-flow";
import { CustomerShell } from "@/components/layout/customer-shell";
import { APP_NAME } from "@/lib/constants";
import { getPublicMenuDocs, getPublicRestaurantDocs } from "@/lib/server/public-firestore";
import { buildFoodItemMetadata } from "@/lib/social-commerce";
import type { MenuItem, Restaurant } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug, itemId } = await params;
  const [restaurants, menu] = await Promise.all([
    getPublicRestaurantDocs(slug),
    getPublicMenuDocs(slug),
  ]).catch(() => [[], []] as const);
  const restaurant = restaurants.find((item) => item.slug === slug || item.id === slug) as unknown as Restaurant | undefined;
  const item = menu.find((entry) => [entry.id, entry.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")].includes(itemId)) as unknown as MenuItem | undefined;
  if (restaurant && item) {
    const image = absoluteHttpsImage(item.image || restaurant.logo || restaurant.image || "/images/fallback-food.svg");
    return buildFoodItemMetadata(restaurant, { ...item, image });
  }

  return {
    title: `Menu item | ${APP_NAME}`,
    description: `Order from ${slug} on ${APP_NAME}.`,
  };
}

export default async function FoodItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; itemId: string }>;
  searchParams: Promise<{ source?: string; offer?: string }>;
}) {
  const { slug, itemId } = await params;
  const { source, offer } = await searchParams;

  return (
    <CustomerShell>
      <FoodItemDetailFlow
        restaurantSlug={slug}
        itemId={itemId}
        source={source}
        offerCode={offer}
      />
    </CustomerShell>
  );
}

function absoluteHttpsImage(value: string) {
  if (/^https:\/\//i.test(value)) return value;
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://violet-squid-380447.hostingersite.com";
  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}
