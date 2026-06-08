import { Suspense } from "react";
import { RestaurantBrowserFlow } from "@/components/flows/restaurant-browser-flow";
import { CustomerShell } from "@/components/layout/customer-shell";
import { InlineLoading } from "@/components/state/page-state";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function RestaurantsPage() {
  return (
    <CustomerShell>
      <Suspense fallback={<InlineLoading label="Loading restaurants" />}>
        <RestaurantBrowserFlow />
      </Suspense>
    </CustomerShell>
  );
}
