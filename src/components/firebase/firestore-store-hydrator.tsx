"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { listenPublicMenu, listenPublicOffers, listenPublicRestaurants } from "@/services/public-data-service";
import { listenKitchenOrders } from "@/services/restaurant-ops-service";
import { listenInventory, listenLoyaltyCustomers } from "@/services/production-data-service";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant";
import { useAppStore } from "@/lib/app-store";
import type { InventoryItem, LoyaltyCustomer } from "@/lib/types";

export function FirestoreStoreHydrator() {
  const pathname = usePathname();
  const adminSurface = pathname.startsWith("/admin");
  const loginSurface = pathname === "/admin/login" || pathname === "/owner/login";
  const ownerSurface = (pathname === "/owner" || pathname.startsWith("/owner/") || pathname.startsWith("/pos")) && !loginSurface;
  const publicSurface = !adminSurface && !loginSurface && !ownerSurface;

  useEffect(() => {
    if (adminSurface || loginSurface) return;

    const unsubscribers = publicSurface
      ? [
          listenPublicRestaurants((restaurants) => {
            useAppStore.setState({ restaurants });
          }),
          listenPublicMenu(DEFAULT_RESTAURANT_ID, (menuItems) => {
            useAppStore.setState({ menuItems });
          }),
          listenPublicOffers(DEFAULT_RESTAURANT_ID, (offers) => {
            useAppStore.setState({ offers });
          }),
        ]
      : [];

    if (ownerSurface) {
      unsubscribers.push(
        listenKitchenOrders(DEFAULT_RESTAURANT_ID, undefined, (tableOrders) => {
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
  }, [adminSurface, loginSurface, ownerSurface, publicSurface]);

  return null;
}
