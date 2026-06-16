import dynamic from "next/dynamic";
import { ModuleLoading } from "@/components/state/page-state";

const OwnerSettingsFlow = dynamic(
  () => import("@/components/flows/owner-settings-flow").then((module) => module.OwnerSettingsFlow),
  { loading: () => <ModuleLoading module="owner" /> },
);

export default function OwnerSettingsPage() {
  return <OwnerSettingsFlow />;
}
