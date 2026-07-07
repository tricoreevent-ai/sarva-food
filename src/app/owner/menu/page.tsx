import dynamic from "next/dynamic";
import { DashboardRouteSkeleton } from "@/components/state/route-skeletons";

const OwnerMenuManagementFlow = dynamic(
  () => import("@/components/flows/owner-menu-management-flow").then((module) => module.OwnerMenuManagementFlow),
  { loading: () => <DashboardRouteSkeleton app="owner" variant="menu" /> },
);

export default function OwnerMenuPage() {
  return <OwnerMenuManagementFlow />;
}
