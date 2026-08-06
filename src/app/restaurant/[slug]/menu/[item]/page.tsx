import { FoodItemDetailFlow } from "@/components/flows/food-item-detail-flow";
import { CustomerShell } from "@/components/layout/customer-shell";

export default async function PublicMenuItemPage({ params }: { params: Promise<{ slug: string; item: string }> }) {
  const { slug, item } = await params;
  return <CustomerShell><FoodItemDetailFlow restaurantSlug={slug} itemId={item} source="campaign" /></CustomerShell>;
}
