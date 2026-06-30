"use client";

import dynamic from "next/dynamic";
import { ModuleLoading } from "@/components/state/page-state";

const PrinterSettingsFlow = dynamic(
  () => import("@/components/flows/printer-settings-flow").then((module) => module.PrinterSettingsFlow),
  { ssr: false, loading: () => <ModuleLoading module="owner" /> },
);

export default function OwnerPrintersPage() {
  return <PrinterSettingsFlow />;
}
