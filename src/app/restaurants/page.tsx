import nextDynamic from "next/dynamic";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CustomerRouteSkeleton } from "@/components/state/route-skeletons";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const RestaurantBrowserFlow = nextDynamic(
  () => import("@/components/flows/restaurant-browser-flow").then((module) => module.RestaurantBrowserFlow),
  { loading: () => <CustomerRouteSkeleton variant="restaurants" /> },
);

export default function RestaurantsPage() {
  return (
    <CustomerShell>
      <RestaurantBrowserFlow />
    </CustomerShell>
  );
}
