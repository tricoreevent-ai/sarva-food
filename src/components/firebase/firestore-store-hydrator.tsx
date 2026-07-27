"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { listenPublicCms, listenPublicOffers, listenPublicRestaurants } from "@/services/public-data-service";
import { menuDocToUi } from "@/services/public-data-service";
import { fetchOwnerMenuItems, listenMenuItems } from "@/services/advanced-menu-service";
import { listenInventory, listenLoyaltyCustomers } from "@/services/production-data-service";
import { DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import { useAppStore } from "@/lib/app-store";
import { RELEASE_VERSION } from "@/lib/release";
import { safeClientReason } from "@/lib/client-diagnostics";
import type { InventoryItem, LoyaltyCustomer } from "@/lib/types";

declare global {
  interface Window {
    __BUILD_INFO__?: {
      gitCommit: string;
      buildDate: string;
      environment: string;
      version: string;
    };
  }
}

const BUILD_INFO = {
  gitCommit: process.env.NEXT_PUBLIC_BUILD_VERSION ?? process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_COMMIT_SHA ?? "local",
  buildDate: process.env.NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP ?? process.env.NEXT_PUBLIC_BUILD_DATE ?? "local",
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? RELEASE_VERSION,
};

export function FirestoreStoreHydrator() {
  const pathname = usePathname();
  const adminSurface = pathname.startsWith("/admin");
  const loginSurface = pathname === "/admin/login" || pathname === "/owner/login";
  const ownerSurface = (pathname === "/owner" || pathname.startsWith("/owner/") || pathname.startsWith("/pos")) && !loginSurface;
  const ownerDashboardSurface = pathname === "/owner" || pathname.startsWith("/owner/dashboard");
  const ownerInventorySurface = ownerDashboardSurface || pathname.startsWith("/owner/inventory") || pathname.startsWith("/owner/reports");
  const ownerLoyaltySurface = ownerDashboardSurface || pathname.startsWith("/owner/loyalty") || pathname.startsWith("/owner/customers");
  const publicSurface = !adminSurface && !loginSurface && !ownerSurface;
  const publicDiscoverySurface = publicSurface && (pathname === "/" || pathname === "/restaurants" || pathname === "/offers");
  const publicCmsSurface = publicSurface;
  const publicOffersSurface = publicSurface && pathname === "/offers";
  const ownerRestaurantId = useAppStore((state) => resolveTenantId(state.authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID));

  useEffect(() => {
    window.__BUILD_INFO__ = BUILD_INFO;
  }, []);

  useEffect(() => {
    if (adminSurface || loginSurface) return;

    let active = true;
    const unsubscribers: Array<() => void> = [];

    if (publicDiscoverySurface) {
      unsubscribers.push(
        listenPublicRestaurants((restaurants) => {
          useAppStore.setState({ restaurants });
        }),
      );
    }

    if (publicOffersSurface) {
      unsubscribers.push(
        listenPublicOffers(undefined, (offers) => {
          useAppStore.setState({ offers });
        }),
      );
    }

    if (publicCmsSurface) {
      unsubscribers.push(
        listenPublicCms((cmsSettings) => {
          useAppStore.setState({ cmsSettings });
        }),
      );
    }

    if (ownerSurface) {
      const restaurantId = ownerRestaurantId;
      const applyOwnerMenuItems = (items: Parameters<typeof menuDocToUi>[1][]) => {
        useAppStore.setState({ menuItems: items.map((item) => menuDocToUi(item.id, item)) });
      };
      useAppStore.setState({
        menuItems: [],
        menuCategories: [],
        comboOffers: [],
        menuSchedules: [],
        inventoryItems: [],
        tableOrders: [],
        loyaltyCustomers: [],
      });

      void fetchOwnerMenuItems(restaurantId)
        .then((items) => {
          if (active) applyOwnerMenuItems(items);
        })
        .catch((error) => console.warn("[Food Gedi owner menu] server load failed", safeClientReason(error)));

      unsubscribers.push(
        listenMenuItems(restaurantId, (items) => {
          applyOwnerMenuItems(items);
        }, (error) => {
          console.warn("[Food Gedi owner menu] Firestore listener failed; keeping server menu snapshot.", safeClientReason(error));
          void fetchOwnerMenuItems(restaurantId)
            .then((items) => {
              if (active) applyOwnerMenuItems(items);
            })
            .catch(() => undefined);
        }),
      );
      if (ownerInventorySurface) {
        unsubscribers.push(
          listenInventory((items) => {
            useAppStore.setState({
              inventoryItems: items.map((item) => ({
                id: item.id,
                name: String(item.itemName ?? item.name ?? item.id),
                category: String(item.category ?? ""),
                branchId: String(item.branchId ?? ""),
                currentStock: Number(item.currentStock ?? item.quantity ?? 0),
                unit: String(item.unit ?? ""),
                reorderLevel: Number(item.reorderLevel ?? item.reorderAt ?? 0),
                supplier: typeof item.supplier === "string" ? item.supplier : typeof item.supplierId === "string" ? item.supplierId : undefined,
              } satisfies InventoryItem)),
            });
          }),
        );
      }
      if (ownerLoyaltySurface) {
        unsubscribers.push(
          listenLoyaltyCustomers((items) => {
            useAppStore.setState({
              loyaltyCustomers: items.map((item) => ({
                id: item.id,
                name: String(item.name ?? item.id),
                phone: String(item.phone ?? ""),
                email: typeof item.email === "string" ? item.email : undefined,
                points: Number(item.points ?? item.loyaltyPoints ?? 0),
                tier: (typeof item.tier === "string" ? item.tier : "Regular") as LoyaltyCustomer["tier"],
                lifetimeValue: Number(item.lifetimeValue ?? 0),
                totalOrders: Number(item.totalOrders ?? 0),
                lastOrderAt: typeof item.lastOrderAt === "string" ? item.lastOrderAt : undefined,
                orderFrequency: `${Number(item.totalOrders ?? 0)} orders`,
                inactiveRisk: Boolean(item.inactiveRisk ?? false),
              } satisfies LoyaltyCustomer)),
            });
          }),
        );
      }
    }

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [adminSurface, loginSurface, ownerInventorySurface, ownerLoyaltySurface, ownerRestaurantId, ownerSurface, publicCmsSurface, publicDiscoverySurface, publicOffersSurface]);

  return null;
}
