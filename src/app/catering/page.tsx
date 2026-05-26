import dynamic from "next/dynamic";
import { PageLoading } from "@/components/state/page-state";

const CateringFlow = dynamic(
  () => import("@/components/flows/catering-flow").then((module) => module.CateringFlow),
  { loading: () => <PageLoading /> },
);

export default function CateringPage() {
  return <CateringFlow />;
}
