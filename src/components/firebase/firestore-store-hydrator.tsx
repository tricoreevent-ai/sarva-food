"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getFirebaseApp, getFirebaseAuth, isFirebaseConfigured } from "@/firebase/client";
import { listenPublicCms, listenPublicOffers, listenPublicRestaurants } from "@/services/public-data-service";
import { menuDocToUi } from "@/services/public-data-service";
import { listenMenuItems } from "@/services/advanced-menu-service";
import { listenKitchenOrders } from "@/services/restaurant-ops-service";
import { listenInventory, listenLoyaltyCustomers } from "@/services/production-data-service";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant";
import { useAppStore } from "@/lib/app-store";
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
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
};

export function FirestoreStoreHydrator() {
  const pathname = usePathname();
  const adminSurface = pathname.startsWith("/admin");
  const loginSurface = pathname === "/admin/login" || pathname === "/owner/login";
  const ownerSurface = (pathname === "/owner" || pathname.startsWith("/owner/") || pathname.startsWith("/pos")) && !loginSurface;
  const publicSurface = !adminSurface && !loginSurface && !ownerSurface;
  const publicDiscoverySurface = publicSurface && (pathname === "/" || pathname === "/restaurants" || pathname === "/offers");
  const publicCmsSurface = publicSurface;
  const publicOffersSurface = publicSurface && pathname === "/offers";

  useEffect(() => {
    window.__BUILD_INFO__ = BUILD_INFO;
    console.log("BUILD_INFO", window.__BUILD_INFO__);
  }, []);

  useEffect(() => {
    if (adminSurface || loginSurface) return;

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
      const restaurantId = useAppStore.getState().authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
      logOwnerRuntimeDiagnostics(restaurantId);
      useAppStore.setState({
        menuItems: [],
        menuCategories: [],
        comboOffers: [],
        menuSchedules: [],
        inventoryItems: [],
        tableOrders: [],
        loyaltyCustomers: [],
      });

      unsubscribers.push(
        listenMenuItems(restaurantId, (items) => {
          useAppStore.setState({ menuItems: items.map((item) => menuDocToUi(item.id, item)) });
        }),
        listenKitchenOrders(restaurantId, undefined, (tableOrders) => {
          useAppStore.setState({ tableOrders });
        }),
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

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [adminSurface, loginSurface, ownerSurface, publicCmsSurface, publicDiscoverySurface, publicOffersSurface]);

  return null;
}

function logOwnerRuntimeDiagnostics(restaurantId: string) {
  const state = useAppStore.getState();
  const auth = isFirebaseConfigured ? getFirebaseAuth() : null;
  const app = isFirebaseConfigured ? getFirebaseApp() : null;
  const restaurant = state.restaurants.find((item) => item.slug === restaurantId || item.id === restaurantId);
  const ownerId = auth?.currentUser?.uid ?? state.authUser.id;
  const slug = restaurant?.slug ?? restaurantId;

  console.log("PROJECT_ID", app?.options.projectId ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "");
  console.log("APP_ID", app?.options.appId ?? process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "");
  console.log("AUTH_USER", auth?.currentUser?.uid);
  console.log("RESTAURANT_ID", restaurantId);
  console.log("OWNER_ID", ownerId);
  console.log("RESTAURANT_SLUG", slug);
  console.log("RESTAURANT_LOOKUP", {
    id: restaurant?.id ?? restaurantId,
    slug,
    ownerId: restaurant?.ownerId ?? ownerId,
    email: restaurant?.ownerProfile?.businessEmail,
    name: restaurant?.name,
  });
}
