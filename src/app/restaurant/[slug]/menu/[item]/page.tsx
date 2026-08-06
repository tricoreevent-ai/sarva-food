import { FoodItemDetailFlow } from "@/components/flows/food-item-detail-flow";
import { CustomerShell } from "@/components/layout/customer-shell";

export default async function PublicMenuItemPage({ params, searchParams }: { params: Promise<{ slug: string; item: string }>; searchParams: Promise<{ campaign?: string }> }) {
  const { slug, item } = await params;
  const { campaign } = await searchParams;
  return <CustomerShell><FoodItemDetailFlow restaurantSlug={slug} itemId={item} source={campaign ? `campaign:${campaign}` : "campaign"} /></CustomerShell>;
}
