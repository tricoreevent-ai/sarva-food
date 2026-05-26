import dynamic from "next/dynamic";
import { PageLoading } from "@/components/state/page-state";

const OwnerMenuManagementFlow = dynamic(
  () => import("@/components/flows/owner-menu-management-flow").then((module) => module.OwnerMenuManagementFlow),
  { loading: () => <PageLoading /> },
);

export default function OwnerMenuPage() {
  return <OwnerMenuManagementFlow />;
}
