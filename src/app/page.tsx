import nextDynamic from "next/dynamic";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CustomerRouteSkeleton } from "@/components/state/route-skeletons";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const CustomerDiscoveryHome = nextDynamic(
  () => import("@/components/flows/customer-discovery-home").then((module) => module.CustomerDiscoveryHome),
  { loading: () => <CustomerRouteSkeleton variant="home" /> },
);

export default function HomePage() {
  return (
    <CustomerShell>
      <CustomerDiscoveryHome />
    </CustomerShell>
  );
}
