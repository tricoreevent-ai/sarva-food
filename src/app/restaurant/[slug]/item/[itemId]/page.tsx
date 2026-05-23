import { FoodItemDetailFlow } from "@/components/flows/food-item-detail-flow";
import { APP_NAME } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug } = await params;

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
    <FoodItemDetailFlow
      restaurantSlug={slug}
      itemId={itemId}
      source={source}
      offerCode={offer}
    />
  );
}
