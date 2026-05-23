import { CustomerDiscoveryHome } from "@/components/flows/customer-discovery-home";
import { CustomerShell } from "@/components/layout/customer-shell";

export default function HomePage() {
  return (
    <CustomerShell>
      <CustomerDiscoveryHome />
    </CustomerShell>
  );
}
