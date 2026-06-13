"use client";

import { ReactNode, useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { FirebaseStartupStatus } from "@/components/firebase/firebase-startup-status";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { DashboardQuickActions, MobileOfflineBanner } from "@/components/mobile/mobile-experience";
import { useAppStore } from "@/lib/app-store";
import { filterOwnerNavigationForRestaurant } from "@/lib/access-control";
import { moduleThemeKey } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";
import { adminTheme } from "@/themes/admin-theme";
import {
  adminNav,
  cateringNav,
  deliveryNav,
  ownerNav,
  posNav,
  studioNav,
} from "@/lib/navigation";

export type DashboardApp = "owner" | "admin" | "delivery" | "studio" | "catering" | "pos";

const appConfig = {
  owner: { name: "Owner Dashboard", nav: ownerNav, homeHref: "/owner" },
  admin: { name: "Super Admin", nav: adminNav, homeHref: "/admin" },
  delivery: { name: "Delivery Partner", nav: deliveryNav, homeHref: "/delivery" },
  studio: { name: "Marketing Studio", nav: studioNav, homeHref: "/studio" },
  catering: { name: "Catering", nav: cateringNav, homeHref: "/catering" },
  pos: { name: "POS Billing", nav: posNav, homeHref: "/owner/pos" },
} satisfies Record<DashboardApp, { name: string; nav: typeof ownerNav; homeHref: string }>;

export function DashboardShellClient({
  app,
  children,
}: {
  app: DashboardApp;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const authUser = useAppStore((state) => state.authUser);
  const restaurants = useAppStore((state) => state.restaurants);
  const themeSurface = app === "admin" ? "admin" : null;
  const moduleTheme = useModuleTheme(themeSurface, authUser.id);
  const forceLightTheme = app === "owner" || app === "pos";

  useEffect(() => {
    if (!forceLightTheme || typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("dark");
    root.dataset.theme = "light";
    root.style.colorScheme = "light";
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("sarva-owner-theme:")) window.localStorage.removeItem(key);
    }
  }, [forceLightTheme]);

  if (pathname === "/admin/login" || pathname === "/owner/login") {
    return children;
  }

  const config = appConfig[app];
  const currentRestaurant = restaurants.find((restaurant) => restaurant.slug === authUser.restaurantSlug || restaurant.id === authUser.restaurantSlug);
  const navItems = app === "owner" || app === "pos"
    ? filterOwnerNavigationForRestaurant(config.nav, currentRestaurant, authUser.role)
    : config.nav;
  const isPosWorkspace = pathname.startsWith("/owner/pos") || pathname.startsWith("/pos");
  const adminStyle = app === "admin"
    ? ({
        "--admin-console-bg": adminTheme.colors.background,
        "--admin-console-card": adminTheme.colors.card,
        "--admin-console-primary": adminTheme.colors.primary,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={cn(
        "min-h-screen",
        app === "admin" && ["admin-premium", moduleTheme === "dark" ? "admin-dark" : "theme-admin-light"],
        (app === "owner" || app === "pos") && ["owner-premium", "theme-owner-light"],
      )}
      style={adminStyle}
    >
      {app === "owner" || app === "pos" ? <MobileOfflineBanner /> : null}
      <DashboardTopbar app={app} appName={config.name} navItems={navItems} homeHref={config.homeHref} />
      <div className={cn(isPosWorkspace ? "" : "lg:flex")}>
        {isPosWorkspace ? null : <DashboardSidebar appName={config.name} items={navItems} homeHref={config.homeHref} />}
        <main className={cn("min-w-0 flex-1 pb-24 lg:pb-8", isPosWorkspace ? "p-0" : "px-4 py-5 sm:px-5 2xl:px-8")}>
          <div className={cn("w-full", isPosWorkspace || app === "owner" ? "max-w-none" : "mx-auto max-w-7xl")}>
            {app === "admin" ? <FirebaseStartupStatus /> : null}
            {children}
          </div>
        </main>
      </div>
      {isPosWorkspace ? null : <DashboardQuickActions app={app} />}
    </div>
  );
}

function useModuleTheme(surface: "owner" | "admin" | null, userId?: string): "light" | "dark" {
  return useSyncExternalStore(
    subscribeModuleTheme,
    () => readModuleTheme(surface, userId),
    () => "light",
  );
}

function subscribeModuleTheme(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onChange);
  };
}

function readModuleTheme(surface: "owner" | "admin" | null, userId?: string): "light" | "dark" {
  if (!surface || typeof window === "undefined") return "light";
  const key = moduleThemeKey(surface, userId);
  const globalTheme = window.localStorage.getItem("sarva-theme");
  const saved = window.localStorage.getItem(key) || globalTheme || "system";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return saved === "dark" || (saved === "system" && prefersDark) ? "dark" : "light";
}
