import dynamic from "next/dynamic";
import { PageLoading } from "@/components/state/page-state";

const PosBillingFlow = dynamic(
  () => import("@/components/flows/pos-billing-flow").then((module) => module.PosBillingFlow),
  { loading: () => <PageLoading /> },
);

export default function OwnerPosPage() {
  return <PosBillingFlow />;
}
