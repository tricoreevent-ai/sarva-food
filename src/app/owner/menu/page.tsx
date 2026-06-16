import dynamic from "next/dynamic";
import { ModuleLoading } from "@/components/state/page-state";

const OwnerMenuManagementFlow = dynamic(
  () => import("@/components/flows/owner-menu-management-flow").then((module) => module.OwnerMenuManagementFlow),
  { loading: () => <ModuleLoading module="owner" /> },
);

export default function OwnerMenuPage() {
  return <OwnerMenuManagementFlow />;
}
