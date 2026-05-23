"use client";

import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, limit, query, where, orderBy } from "firebase/firestore";
import { ref } from "firebase/storage";
import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
  isFirebaseConfigured,
} from "@/firebase/client";
import { getClientEnv, shouldUseFirebase } from "@/lib/env";
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from "@/lib/tenant";

export type FirebaseDiagnosticStatus = "pass" | "warn" | "fail";

export type FirebaseDiagnosticItem = {
  label: string;
  status: FirebaseDiagnosticStatus;
  detail: string;
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
];

export async function runFirebaseDiagnostics(): Promise<FirebaseDiagnostics> {
  const env = getClientEnv();
  const items: FirebaseDiagnosticItem[] = [];
  const collections: FirebaseDiagnosticItem[] = [];

  items.push({
    label: "Environment flag",
    status: shouldUseFirebase() ? "pass" : "warn",
    detail: shouldUseFirebase() ? "NEXT_PUBLIC_USE_FIREBASE=true" : "Firebase is disabled by NEXT_PUBLIC_USE_FIREBASE.",
  });

  items.push({
    label: "Client configuration",
    status: isFirebaseConfigured ? "pass" : "fail",
    detail: isFirebaseConfigured ? `Project ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}` : "One or more public Firebase env values are missing.",
  });

  if (!shouldUseFirebase() || !isFirebaseConfigured || typeof window === "undefined") {
    return { generatedAt: new Date().toISOString(), items, collections };
  }

  try {
    const app = getFirebaseApp();
    items.push({ label: "Firebase app", status: "pass", detail: app.name || "[DEFAULT]" });
  } catch (error) {
    items.push({ label: "Firebase app", status: "fail", detail: messageFor(error) });
  }

  try {
    const auth = getFirebaseAuth();
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
    items.push({
      label: "Authentication",
      status: auth.currentUser ? "pass" : "warn",
      detail: auth.currentUser ? `Signed in as ${auth.currentUser.email ?? auth.currentUser.uid}` : "Auth initialized; no user signed in.",
    });
  } catch (error) {
    items.push({ label: "Authentication", status: "fail", detail: messageFor(error) });
  }

  try {
    const db = getFirebaseDb();
    const health = await getDocs(query(collection(db, "restaurants"), limit(1)));
    items.push({
      label: "Firestore",
      status: "pass",
      detail: health.empty ? "Reachable; seed data not found yet." : "Reachable with data.",
    });
  } catch (error) {
    items.push({ label: "Firestore", status: "fail", detail: messageFor(error) });
  }

  try {
    const storage = getFirebaseStorage();
    ref(storage, "diagnostics/.keep");
    items.push({ label: "Storage", status: "pass", detail: "Storage SDK initialized." });
  } catch (error) {
    items.push({ label: "Storage", status: "fail", detail: messageFor(error) });
  }

  for (const collectionName of REQUIRED_FIRESTORE_COLLECTIONS) {
    try {
      const snapshot = await getDocs(query(collection(getFirebaseDb(), collectionName), limit(1)));
      collections.push({
        label: collectionName,
        status: snapshot.empty ? "warn" : "pass",
        detail: snapshot.empty ? "Reachable but empty. Run seed initializer." : "Reachable.",
      });
    } catch (error) {
      collections.push({ label: collectionName, status: "fail", detail: messageFor(error) });
    }
  }

  for (const check of [
    { label: "Kitchen queue index", collectionName: "kitchenOrders", constraints: [where("tenantId", "==", DEFAULT_TENANT_ID), where("branchId", "==", DEFAULT_BRANCH_ID), where("status", "in", ["new", "preparing", "ready"]), orderBy("createdAt", "desc"), limit(1)] },
    { label: "Accounting date index", collectionName: "accountingEntries", constraints: [where("tenantId", "==", DEFAULT_TENANT_ID), where("branchId", "==", DEFAULT_BRANCH_ID), orderBy("createdAt", "desc"), limit(1)] },
    { label: "Customer phone index", collectionName: "customers", constraints: [where("tenantId", "==", DEFAULT_TENANT_ID), where("normalizedPhone", "==", "9900001111"), limit(1)] },
  ]) {
    try {
      await getDocs(query(collection(getFirebaseDb(), check.collectionName), ...check.constraints));
      items.push({ label: check.label, status: "pass", detail: "Indexed query succeeded." });
    } catch (error) {
      items.push({ label: check.label, status: "fail", detail: messageFor(error) });
    }
  }

  return { generatedAt: new Date().toISOString(), items, collections };
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Firebase error.";
}
