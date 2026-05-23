import { RestaurantDetailFlow } from "@/components/flows/restaurant-detail-flow";
import { CustomerShell } from "@/components/layout/customer-shell";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <CustomerShell>
      <RestaurantDetailFlow slug={slug} />
    </CustomerShell>
  );
}
