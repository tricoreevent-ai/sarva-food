"use client";

import { lazy, Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { ModuleRuntimeBoundary, type ModuleSurface } from "@/components/runtime/module-runtime-boundary";
import { IdleMount } from "@/components/runtime/idle-mount";
import { AlertProvider } from "@/components/ui/AlertProvider";
import type { DashboardApp } from "@/components/layout/dashboard-shell-client";

const LazyDashboardShellClient = lazy(() =>
  import("@/components/layout/dashboard-shell-client").then((module) => ({
    default: module.DashboardShellClient,
  })),
);
const LazyAuthSessionBridge = dynamic(() => import("@/components/auth/auth-session-bridge").then((module) => module.AuthSessionBridge), { ssr: false });
const LazyFirestoreStoreHydrator = dynamic(() => import("@/components/firebase/firestore-store-hydrator").then((module) => module.FirestoreStoreHydrator), { ssr: false });
const LazyAnalyticsProvider = dynamic(() => import("@/components/monitoring/analytics-provider").then((module) => module.AnalyticsProvider), { ssr: false });
const LazyAppToaster = dynamic(() => import("@/components/ui/app-toaster").then((module) => module.AppToaster), { ssr: false });
const LazySyncCenterScope = dynamic(() => import("@/components/offline/sync-center-scope").then((module) => module.SyncCenterScope), { ssr: false });
const LazyPwaRegistrar = dynamic(() => import("@/components/pwa/pwa-registrar").then((module) => module.PwaRegistrar), { ssr: false });
const LazyPushNotificationProvider = dynamic(() => import("@/components/pwa/push-notification-provider").then((module) => module.PushNotificationProvider), { ssr: false });

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
        <DashboardRuntimeProviders>{children}</DashboardRuntimeProviders>
      </ModuleRuntimeBoundary>
    );
  }

  return (
    <ModuleRuntimeBoundary module={surface}>
      <DashboardRuntimeProviders>
        <LazyDashboardShellClient app={app}>{children}</LazyDashboardShellClient>
      </DashboardRuntimeProviders>
    </ModuleRuntimeBoundary>
  );
}

function surfaceForDashboardApp(app: DashboardApp): ModuleSurface {
  if (app === "admin") return "admin";
  return "owner";
}

function DashboardRuntimeProviders({ children }: { children: ReactNode }) {
  return (
    <AlertProvider>
      <LazyAuthSessionBridge />
      <LazyFirestoreStoreHydrator />
      <LazySyncCenterScope />
      <LazyAppToaster />
      <IdleMount>
        <LazyPwaRegistrar />
        <LazyPushNotificationProvider />
        <Suspense fallback={null}>
          <LazyAnalyticsProvider />
        </Suspense>
      </IdleMount>
      {children}
    </AlertProvider>
  );
}
