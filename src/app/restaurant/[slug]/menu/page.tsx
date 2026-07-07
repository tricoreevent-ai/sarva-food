import dynamic from "next/dynamic";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CustomerRouteSkeleton } from "@/components/state/route-skeletons";

const CustomerMenuFlow = dynamic(
  () => import("@/components/flows/customer-menu-flow").then((module) => module.CustomerMenuFlow),
  { loading: () => <CustomerRouteSkeleton variant="menu" /> },
);

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
      <CustomerMenuFlow
        restaurantSlug={slug}
        source={source}
        offerCode={offer}
        highlightItemId={item}
      />
    </CustomerShell>
  );
}
