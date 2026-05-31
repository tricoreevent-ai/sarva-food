export type FirebaseDiagnosticStatus = "pass" | "warn" | "fail";

export type FirebaseDiagnosticItem = {
  label: string;
  status: FirebaseDiagnosticStatus;
  detail: string;
  metric?: number;
};

export type FirebaseDiagnostics = {
  generatedAt: string;
  items: FirebaseDiagnosticItem[];
  collections: FirebaseDiagnosticItem[];
};

export const REQUIRED_FIRESTORE_COLLECTIONS = [
  "users",
  "tenants",
  "roles",
  "restaurants",
  "branches",
  "tables",
  "orders",
  "orderItems",
  "kitchenOrders",
  "menuCategories",
  "menuItems",
  "deliveryMenus",
  "dineInMenus",
  "customers",
  "customerProfiles",
  "customerOrders",
  "customerLoyalty",
  "loyaltyCustomers",
  "accountingEntries",
  "expenses",
  "inventory",
  "inventoryTransactions",
  "purchaseOrders",
  "suppliers",
  "reports",
  "printerProfiles",
  "receiptTemplates",
  "offers",
  "coupons",
  "settings",
  "notifications",
  "staffActivityLogs",
  "paymentTransactions",
  "deliveryAgents",
  "customerAddresses",
] as const;
