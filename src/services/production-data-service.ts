"use client";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { shouldUseFirebase } from "@/lib/env";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, DEFAULT_TENANT_ID, resolveTenantId } from "@/lib/tenant";
import type { StaffMember } from "@/lib/types";
import { createMetadata, updateMetadata } from "@/services/firestore-metadata";
import { normalizePhone } from "@/services/restaurant-ops-service";

const RESTAURANT_ID = DEFAULT_RESTAURANT_ID;
const BRANCH_ID = DEFAULT_BRANCH_ID;

function currentOwnerId() {
  return getFirebaseAuth().currentUser?.uid ?? "system";
}

function ownerScope(input: { restaurantId?: string; branchId?: string } = {}) {
  const restaurantId = input.restaurantId ?? RESTAURANT_ID;
  return {
    tenantId: resolveTenantId(restaurantId),
    restaurantId,
    branchId: input.branchId ?? BRANCH_ID,
    ownerId: currentOwnerId(),
  };
}

export type OperationalCollection =
  | "reports"
  | "accountingEntries"
  | "expenses"
  | "inventory"
  | "inventoryTransactions"
  | "purchaseOrders"
  | "suppliers"
  | "customers"
  | "loyaltyCustomers"
  | "tables"
  | "roles"
  | "users"
  | "notifications"
  | "staffActivityLogs"
  | "offers"
  | "coupons"
  | "printerProfiles"
  | "receiptTemplates"
  | "paymentTransactions";

export type DateRangeInput = {
  from: Date;
  to: Date;
};

export type AccountingWrite = {
  id?: string;
  type: "income" | "expense" | "journal";
  category: string;
  amount: number;
  gst: number;
  paymentMode: string;
  notes?: string;
  attachmentUrl?: string;
  approvalStatus: "draft" | "pending" | "approved" | "rejected";
  createdBy: string;
  branchId?: string;
  restaurantId?: string;
};

export type InventoryWrite = {
  id?: string;
  itemName: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  supplierId?: string;
  costPerUnit?: number;
  sku?: string;
  price?: number;
  lowStockAlert?: number;
  gstApplicable?: boolean;
  gstRate?: number;
  hsnCode?: string;
  sellable?: boolean;
  branchId?: string;
  restaurantId?: string;
};

export function canUseProductionFirestore() {
  if (!shouldUseFirebase() || !isFirebaseConfigured || typeof window === "undefined") return false;
  return Boolean(getFirebaseAuth().currentUser);
}

export function listenOperationalCollection<T extends DocumentData>(
  collectionName: OperationalCollection,
  constraints: QueryConstraint[],
  onData: (items: Array<T & { id: string }>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!canUseProductionFirestore()) return () => undefined;
  const q = query(collection(getFirebaseDb(), collectionName), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T & { id: string })),
    (error) => onError?.(error),
  );
}

export function listenAccountingEntries(
  range: DateRangeInput,
  onData: (items: Array<DocumentData & { id: string }>) => void,
  onError?: (error: Error) => void,
) {
  return listenOperationalCollection(
    "accountingEntries",
    [
      where("tenantId", "==", DEFAULT_TENANT_ID),
      where("branchId", "==", BRANCH_ID),
      where("createdAt", ">=", range.from),
      where("createdAt", "<=", range.to),
      orderBy("createdAt", "desc"),
      limit(250),
    ],
    onData,
    onError,
  );
}

export function listenInventory(
  onData: (items: Array<DocumentData & { id: string }>) => void,
  onError?: (error: Error) => void,
) {
  return listenOperationalCollection(
    "inventory",
    [where("tenantId", "==", DEFAULT_TENANT_ID), where("branchId", "==", BRANCH_ID), orderBy("itemName", "asc"), limit(250)],
    onData,
    onError,
  );
}

export function listenLoyaltyCustomers(
  onData: (items: Array<DocumentData & { id: string }>) => void,
  onError?: (error: Error) => void,
) {
  return listenOperationalCollection(
    "loyaltyCustomers",
    [where("tenantId", "==", DEFAULT_TENANT_ID), orderBy("loyaltyPoints", "desc"), limit(250)],
    onData,
    onError,
  );
}

export function listenNotifications(
  onData: (items: Array<DocumentData & { id: string }>) => void,
  onError?: (error: Error) => void,
) {
  return listenOperationalCollection(
    "notifications",
    [where("tenantId", "==", DEFAULT_TENANT_ID), where("branchId", "==", BRANCH_ID), where("read", "==", false), orderBy("createdAt", "desc"), limit(50)],
    onData,
    onError,
  );
}

export async function saveAccountingEntry(entry: AccountingWrite) {
  if (!canUseProductionFirestore()) return null;
  const scope = ownerScope(entry);
  const payload = {
    ...entry,
    ...scope,
    ...updateMetadata(entry),
  };
  if (entry.id) {
    await setDoc(doc(getFirebaseDb(), "accountingEntries", entry.id), payload, { merge: true });
    return entry.id;
  }
  const ref = await addDoc(collection(getFirebaseDb(), "accountingEntries"), {
    ...payload,
    tenantId: payload.tenantId,
    ...createMetadata(payload),
  });
  return ref.id;
}

export async function saveInventoryItem(item: InventoryWrite) {
  if (!canUseProductionFirestore()) return null;
  const db = getFirebaseDb();
  const id = item.id ?? `inv-${Date.now()}`;
  const scope = ownerScope(item);
  const payload = {
    ...item,
    id,
    ...scope,
    ...updateMetadata(item),
  };
  await setDoc(doc(db, "inventory", id), {
    ...payload,
    ...createMetadata(payload),
  }, { merge: true });
  await addDoc(collection(db, "inventoryTransactions"), {
    restaurantId: payload.restaurantId,
    tenantId: payload.tenantId,
    branchId: payload.branchId,
    ownerId: payload.ownerId,
    inventoryId: id,
    type: "manual-adjustment",
    quantity: item.quantity,
    unit: item.unit,
    ...createMetadata(payload),
  });
  return id;
}

export async function deductRecipeInventory(input: {
  orderId: string;
  lines: Array<{ itemId?: string; menuItemId?: string; quantity: number; recipe?: Array<{ inventoryId: string; quantity: number }> }>;
}) {
  if (!canUseProductionFirestore()) return;
  const db = getFirebaseDb();
  for (const line of input.lines) {
    for (const recipeItem of line.recipe ?? []) {
      await addDoc(collection(db, "inventoryTransactions"), {
        restaurantId: RESTAURANT_ID,
        tenantId: DEFAULT_TENANT_ID,
        branchId: BRANCH_ID,
        ownerId: currentOwnerId(),
        orderId: input.orderId,
        menuItemId: line.menuItemId ?? line.itemId,
        inventoryId: recipeItem.inventoryId,
        type: "deduction",
        quantity: -(recipeItem.quantity * line.quantity),
        ...createMetadata({ restaurantId: RESTAURANT_ID, branchId: BRANCH_ID }),
      });
    }
  }
}

export async function upsertCustomerProfile(input: {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}) {
  if (!canUseProductionFirestore()) return null;
  const normalized = normalizePhone(input.phone);
  const id = input.id ?? `cust-${normalized || Date.now()}`;
  const db = getFirebaseDb();
  await setDoc(doc(db, "customers", id), {
    id,
    tenantId: DEFAULT_TENANT_ID,
    restaurantId: RESTAURANT_ID,
    branchId: BRANCH_ID,
    ownerId: currentOwnerId(),
    name: input.name,
    phone: input.phone,
    normalizedPhone: normalized,
    email: input.email,
    ...createMetadata({ restaurantId: RESTAURANT_ID, branchId: BRANCH_ID }),
  }, { merge: true });
  if (input.address) {
    await setDoc(doc(db, "customerAddresses", `${id}-default`), {
      id: `${id}-default`,
      tenantId: DEFAULT_TENANT_ID,
      restaurantId: RESTAURANT_ID,
      branchId: BRANCH_ID,
      ownerId: currentOwnerId(),
      customerId: id,
      label: "Default",
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      placeId: input.placeId,
      ...createMetadata({ restaurantId: RESTAURANT_ID, branchId: BRANCH_ID }),
    }, { merge: true });
  }
  return id;
}

export async function logStaffActivity(input: {
  userId: string;
  action: string;
  module: string;
  restaurantId?: string;
  branchId?: string;
}) {
  if (!canUseProductionFirestore()) return null;
  const scope = ownerScope(input);
  const ref = await addDoc(collection(getFirebaseDb(), "staffActivityLogs"), {
    ...input,
    ...scope,
    ...createMetadata(input),
  });
  return ref.id;
}

export async function updateTableStatus(tableId: string, status: string) {
  if (!canUseProductionFirestore()) return;
  await updateDoc(doc(getFirebaseDb(), "tables", tableId), {
    status,
    ownerId: currentOwnerId(),
    ...updateMetadata({ restaurantId: RESTAURANT_ID, branchId: BRANCH_ID }),
  });
}

export async function safeUpsertEmployeeUser(member: StaffMember) {
  if (!canUseProductionFirestore()) return null;
  if (member.role === "owner" || member.role === "admin") {
    throw new Error("Owner and admin accounts must be created by platform admin.");
  }

  await setDoc(doc(getFirebaseDb(), "users", member.id), {
    id: member.id,
    uid: member.id,
    displayName: member.name,
    role: member.role,
    roleId: member.roleId ?? member.role,
    tenantId: DEFAULT_TENANT_ID,
    ownerId: currentOwnerId(),
    tenantIds: [DEFAULT_TENANT_ID],
    restaurantIds: [RESTAURANT_ID],
    branchIds: [member.branchId],
    permissions: member.permissions,
    active: member.status === "active",
    ...createMetadata({ tenantId: DEFAULT_TENANT_ID, restaurantId: RESTAURANT_ID, branchId: member.branchId }),
  }, { merge: true });

  return member.id;
}

export async function probeCollection(collectionName: string) {
  if (!shouldUseFirebase() || !isFirebaseConfigured || typeof window === "undefined") {
    return { collection: collectionName, ok: false, count: 0, message: "Firebase disabled or not configured." };
  }
  const snapshot = await getDocs(query(collection(getFirebaseDb(), collectionName), limit(1)));
  return { collection: collectionName, ok: true, count: snapshot.size, message: snapshot.empty ? "No documents found." : "Reachable." };
}
