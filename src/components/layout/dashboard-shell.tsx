"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FirebaseStartupStatus } from "@/components/firebase/firebase-startup-status";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { OwnerBreadcrumbs } from "@/components/layout/owner-breadcrumbs";
import { DashboardQuickActions, MobileOfflineBanner } from "@/components/mobile/mobile-experience";
import { cn } from "@/lib/utils";
import {
  adminNav,
  cateringNav,
  deliveryNav,
  ownerNav,
  posNav,
  studioNav,
} from "@/lib/navigation";

type DashboardApp = "owner" | "admin" | "delivery" | "studio" | "catering" | "pos";

const appConfig = {
  owner: { name: "Owner Dashboard", nav: ownerNav, homeHref: "/owner" },
  admin: { name: "Super Admin", nav: adminNav, homeHref: "/admin" },
  delivery: { name: "Delivery Partner", nav: deliveryNav, homeHref: "/delivery" },
  studio: { name: "Marketing Studio", nav: studioNav, homeHref: "/studio" },
  catering: { name: "Catering", nav: cateringNav, homeHref: "/catering" },
  pos: { name: "POS Billing", nav: posNav, homeHref: "/owner/pos" },
} satisfies Record<DashboardApp, { name: string; nav: typeof ownerNav; homeHref: string }>;

export function DashboardShell({
  app,
  children,
}: {
  app: DashboardApp;
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/admin/login" || pathname === "/owner/login") {
    return children;
  }

  const config = appConfig[app];
  const isPosWorkspace = pathname.startsWith("/owner/pos") || pathname.startsWith("/pos");

  return (
    <div
      className={cn(
        "min-h-screen lg:flex",
        app === "admin" && "admin-premium",
        (app === "owner" || app === "pos") && "owner-premium",
      )}
      >
      <MobileOfflineBanner />
      {isPosWorkspace ? null : <DashboardSidebar appName={config.name} items={config.nav} homeHref={config.homeHref} />}
      <main className={cn("min-w-0 flex-1 pb-24 lg:pb-8", isPosWorkspace ? "p-0" : "px-4 pt-5 sm:px-5 2xl:px-8")}>
        <div className={cn("w-full", isPosWorkspace || app === "owner" ? "max-w-none" : "mx-auto max-w-7xl")}>
          {app === "admin" ? <FirebaseStartupStatus /> : null}
          {app === "owner" && !isPosWorkspace ? <OwnerBreadcrumbs className="mb-4" /> : null}
          {children}
        </div>
      </main>
      {isPosWorkspace ? null : <DashboardQuickActions app={app} />}
    </div>
  );
}
