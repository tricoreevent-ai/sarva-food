import dynamic from "next/dynamic";
import { ModuleLoading } from "@/components/state/page-state";

const OwnerOrderManagementFlow = dynamic(
  () => import("@/components/flows/owner-order-management-flow").then((module) => module.OwnerOrderManagementFlow),
  { loading: () => <ModuleLoading module="owner" /> },
);

export default function OwnerOrdersPage() {
  return <OwnerOrderManagementFlow />;
}
