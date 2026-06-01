"use client";

import { lazy, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ModuleRuntimeBoundary, type ModuleSurface } from "@/components/runtime/module-runtime-boundary";
import type { DashboardApp } from "@/components/layout/dashboard-shell-client";

const LazyDashboardShellClient = lazy(() =>
  import("@/components/layout/dashboard-shell-client").then((module) => ({
    default: module.DashboardShellClient,
  })),
);

export function DashboardShell({
  app,
  children,
}: {
  app: DashboardApp;
  children: ReactNode;
}) {
  const surface = surfaceForDashboardApp(app);
  const pathname = usePathname();

  if ((app === "admin" && pathname === "/admin/login") || (app === "owner" && pathname === "/owner/login")) {
    return (
      <ModuleRuntimeBoundary module={surface}>
        {children}
      </ModuleRuntimeBoundary>
    );
  }

  return (
    <ModuleRuntimeBoundary module={surface}>
      <LazyDashboardShellClient app={app}>{children}</LazyDashboardShellClient>
    </ModuleRuntimeBoundary>
  );
}

function surfaceForDashboardApp(app: DashboardApp): ModuleSurface {
  if (app === "admin") return "admin";
  return "owner";
}
