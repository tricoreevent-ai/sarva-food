import dynamic from "next/dynamic";
import { DashboardRouteSkeleton } from "@/components/state/route-skeletons";

const OwnerOrderManagementFlow = dynamic(
  () => import("@/components/flows/owner-order-management-flow").then((module) => module.OwnerOrderManagementFlow),
  { loading: () => <DashboardRouteSkeleton app="owner" variant="orders" /> },
);

export default function OwnerOrdersPage() {
  return <OwnerOrderManagementFlow />;
}
