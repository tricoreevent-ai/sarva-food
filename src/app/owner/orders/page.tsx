import dynamic from "next/dynamic";
import { PageLoading } from "@/components/state/page-state";

const OwnerOrderManagementFlow = dynamic(
  () => import("@/components/flows/owner-order-management-flow").then((module) => module.OwnerOrderManagementFlow),
  { loading: () => <PageLoading /> },
);

export default function OwnerOrdersPage() {
  return <OwnerOrderManagementFlow />;
}
