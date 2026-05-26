import dynamic from "next/dynamic";
import { CustomerShell } from "@/components/layout/customer-shell";
import { PageLoading } from "@/components/state/page-state";

const RestaurantDetailClient = dynamic(
  () => import("@/components/flows/restaurant-detail-flow").then((module) => module.RestaurantDetailFlow),
  { loading: () => <PageLoading /> },
);

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <CustomerShell>
      <RestaurantDetailClient slug={slug} />
    </CustomerShell>
  );
}
