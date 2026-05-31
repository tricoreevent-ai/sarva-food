"use client";

import { lazy, type ReactNode } from "react";
import { ModuleRuntimeBoundary } from "@/components/runtime/module-runtime-boundary";

const LazyCustomerShellClient = lazy(() =>
  import("@/components/layout/customer-shell-client").then((module) => ({
    default: module.CustomerShellClient,
  })),
);

export function CustomerShellRuntime({ children }: { children: ReactNode }) {
  return (
    <ModuleRuntimeBoundary module="customer">
      <LazyCustomerShellClient>{children}</LazyCustomerShellClient>
    </ModuleRuntimeBoundary>
  );
}
