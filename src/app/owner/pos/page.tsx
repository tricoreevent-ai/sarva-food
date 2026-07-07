"use client";

import dynamic from "next/dynamic";
import { PosRouteSkeleton } from "@/components/state/route-skeletons";

const PosBillingFlow = dynamic(
  () => import("@/components/flows/pos-billing-flow").then((module) => module.PosBillingFlow),
  { ssr: false, loading: () => <PosRouteSkeleton /> },
);

export default function OwnerPosPage() {
  return <PosBillingFlow />;
}
