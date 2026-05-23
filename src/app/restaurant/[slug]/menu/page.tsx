import { Suspense } from "react";
import { CustomerMenuFlow } from "@/components/flows/customer-menu-flow";
import { CustomerShell } from "@/components/layout/customer-shell";
import { InlineLoading } from "@/components/state/page-state";

export default async function RestaurantMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string; offer?: string; item?: string }>;
}) {
  const { slug } = await params;
  const { source, offer, item } = await searchParams;

  return (
    <CustomerShell>
      <Suspense fallback={<InlineLoading label="Loading menu" />}>
        <CustomerMenuFlow
          restaurantSlug={slug}
          source={source}
          offerCode={offer}
          highlightItemId={item}
        />
      </Suspense>
    </CustomerShell>
  );
}
