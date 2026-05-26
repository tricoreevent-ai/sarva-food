import dynamic from "next/dynamic";
import { PageLoading } from "@/components/state/page-state";

const OwnerSettingsFlow = dynamic(
  () => import("@/components/flows/owner-settings-flow").then((module) => module.OwnerSettingsFlow),
  { loading: () => <PageLoading /> },
);

export default function OwnerSettingsPage() {
  return <OwnerSettingsFlow />;
}
