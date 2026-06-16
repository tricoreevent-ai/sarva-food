import dynamic from "next/dynamic";
import { ModuleLoading } from "@/components/state/page-state";

const PosBillingFlow = dynamic(
  () => import("@/components/flows/pos-billing-flow").then((module) => module.PosBillingFlow),
  { loading: () => <ModuleLoading module="owner" /> },
);

export default function OwnerPosPage() {
  return <PosBillingFlow />;
}
