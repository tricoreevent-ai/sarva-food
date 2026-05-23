"use client";

import { canUseOperationalFirestore } from "@/services/restaurant-ops-service";

type InitResult = {
  status: "created" | "skipped";
  message: string;
  collections: string[];
};

const BASELINE_COLLECTIONS = [
  "tenants",
  "users",
  "roles",
  "permissions",
  "restaurants",
  "branches",
  "menus",
  "menuCategories",
  "cuisines",
  "modifierGroups",
  "inventory",
  "inventoryTransactions",
  "suppliers",
  "customers",
  "customerAddresses",
  "customerOrders",
  "customerLoyalty",
  "loyaltyCustomers",
  "orders",
  "kitchenOrders",
  "restaurantTables",
  "reservations",
  "accountingEntries",
  "expenses",
  "paymentTransactions",
  "printerProfiles",
  "receiptTemplates",
  "reports",
  "deliveryZones",
  "auditLogs",
  "staffActivityLogs",
];

export async function initializeFirestoreBaseline(): Promise<InitResult> {
  if (!canUseOperationalFirestore()) {
    return {
      status: "skipped",
      message: "Firebase is disabled, not configured, or no Firebase user is signed in.",
      collections: BASELINE_COLLECTIONS,
    };
  }

  return {
    status: "skipped",
    message: "Baseline seeding is disabled in production. Create tenants, restaurants, branches, owners, menus, and operational data through the admin and owner flows.",
    collections: BASELINE_COLLECTIONS,
  };
}
