import { CustomerDiscoveryHome } from "@/components/flows/customer-discovery-home";
import { CustomerShell } from "@/components/layout/customer-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function HomePage() {
  return (
    <CustomerShell>
      <CustomerDiscoveryHome />
    </CustomerShell>
  );
}
