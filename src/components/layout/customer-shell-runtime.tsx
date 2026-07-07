"use client";

import { lazy, Suspense, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ModuleRuntimeBoundary } from "@/components/runtime/module-runtime-boundary";
import { IdleMount } from "@/components/runtime/idle-mount";
import { AlertProvider } from "@/components/ui/AlertProvider";

const LazyCustomerShellClient = lazy(() =>
  import("@/components/layout/customer-shell-client").then((module) => ({
    default: module.CustomerShellClient,
  })),
);
const LazyAuthSessionBridge = dynamic(() => import("@/components/auth/auth-session-bridge").then((module) => module.AuthSessionBridge), { ssr: false });
const LazyFirestoreStoreHydrator = dynamic(() => import("@/components/firebase/firestore-store-hydrator").then((module) => module.FirestoreStoreHydrator), { ssr: false });
const LazyAnalyticsProvider = dynamic(() => import("@/components/monitoring/analytics-provider").then((module) => module.AnalyticsProvider), { ssr: false });
const LazyAppToaster = dynamic(() => import("@/components/ui/app-toaster").then((module) => module.AppToaster), { ssr: false });
const LazyPwaRegistrar = dynamic(() => import("@/components/pwa/pwa-registrar").then((module) => module.PwaRegistrar), { ssr: false });
const LazyPushNotificationProvider = dynamic(() => import("@/components/pwa/push-notification-provider").then((module) => module.PushNotificationProvider), { ssr: false });

export function CustomerShellRuntime({ children }: { children: ReactNode }) {
  return (
    <ModuleRuntimeBoundary module="customer">
      <CustomerRuntimeProviders>
        <LazyCustomerShellClient>{children}</LazyCustomerShellClient>
      </CustomerRuntimeProviders>
    </ModuleRuntimeBoundary>
  );
}

export function CustomerRuntimeProviders({ children }: { children: ReactNode }) {
  return (
    <AlertProvider>
      <LazyAuthSessionBridge />
      <LazyFirestoreStoreHydrator />
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
