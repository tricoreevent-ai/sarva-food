"use client";

import {
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { refs, typedDoc } from "@/firebase/collections";
import { calculateRestaurantTax } from "@/lib/menu-engine";
import { shouldUseFirebase } from "@/lib/env";
import { parseFirestoreDateIso } from "@/lib/firestore-date";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, DEFAULT_TENANT_ID, resolveTenantId } from "@/lib/tenant";
import { createMetadata, updateMetadata } from "@/services/firestore-metadata";
import type { OrderLine, PosBill, RestaurantBranch, TableOrder, TaxSettings } from "@/lib/types";
import type {
  CustomerDoc,
  KitchenOrderDoc,
  KitchenOrderStatus,
  PaymentTransactionDoc,
  ReceiptDoc,
  RestaurantSettingsDoc,
} from "@/types/firebase";

const RESTAURANT_ID = DEFAULT_RESTAURANT_ID;
const BRANCH_ID = DEFAULT_BRANCH_ID;

export function canUseOperationalFirestore() {
  if (!shouldUseFirebase() || !isFirebaseConfigured || typeof window === "undefined") {
    return false;
  }

  return Boolean(getFirebaseAuth().currentUser);
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 10) return digits;
  return digits.slice(-10);
}

function effectiveTaxSettingsForBill(bill: PosBill, taxSettings: TaxSettings): TaxSettings {
  return bill.applyGst === false
    ? { ...taxSettings, gstEnabled: false, cgstRate: 0, sgstRate: 0, igstRate: 0, serviceChargeRate: 0 }
    : taxSettings;
}

function packingChargeForBill(bill: PosBill, taxSettings: TaxSettings) {
  return bill.orderType === "dine-in" || bill.waiveParcelCharge ? 0 : taxSettings.defaultPackingCharge;
}

export function kitchenDocToTableOrder(order: KitchenOrderDoc): TableOrder {
  return {
    id: order.id,
    tableNumber: order.tableNumber || labelForOrderType(order.orderType),
    source: order.source,
    orderType: order.orderType,
    guestName: order.customerName,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    scheduledFor: toIsoOptional(order.scheduledFor),
    lines: order.lines.map((line) => ({
      itemId: line.menuItemId,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
      notes: line.notes,
    })),
    status: order.status === "cancelled" ? "completed" : order.status,
    priority: order.priority,
    waiterId: order.waiterId,
    waiterName: order.waiterName,
    branchId: order.branchId,
    createdAt: toIso(order.createdAt),
    etaMinutes: order.etaMinutes,
    total: order.total,
  };
}

export async function safeCreateKitchenOrder(input: {
  id?: string;
  restaurantId?: string;
  branchId?: string;
  orderType: KitchenOrderDoc["orderType"];
  source: KitchenOrderDoc["source"];
  tableNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  scheduledFor?: Date | string;
  waiterId?: string;
  waiterName?: string;
  lines: OrderLine[];
  taxSettings: TaxSettings;
  priority?: "normal" | "rush";
  etaMinutes?: number;
}) {
  if (!canUseOperationalFirestore()) return null;

  const db = getFirebaseDb();
  const orderRef = input.id
    ? typedDoc<KitchenOrderDoc>(db, "kitchenOrders", input.id)
    : doc(refs.kitchenOrders(db));
  const subtotal = input.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const tax = calculateRestaurantTax({
    amount: subtotal,
    settings: input.taxSettings,
    packingCharge: input.orderType === "dine-in" ? 0 : input.taxSettings.defaultPackingCharge,
  });
  const order: KitchenOrderDoc = {
    id: orderRef.id,
    tenantId: resolveTenantId(input.restaurantId ?? DEFAULT_TENANT_ID),
    restaurantId: input.restaurantId ?? RESTAURANT_ID,
    branchId: input.branchId ?? BRANCH_ID,
    orderType: input.orderType,
    source: input.source,
    tableNumber: input.tableNumber,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    deliveryAddress: input.deliveryAddress,
    scheduledFor: input.scheduledFor ? normalizeDate(input.scheduledFor) as KitchenOrderDoc["scheduledFor"] : undefined,
    waiterId: input.waiterId,
    waiterName: input.waiterName,
    status: "new",
    priority: input.priority ?? "normal",
    lines: input.lines.map((line) => ({
      menuItemId: line.itemId,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
      notes: line.notes,
    })),
    subtotal,
    tax: tax.gstAmount,
    total: tax.total,
    paymentStatus: "pending",
    etaMinutes: input.etaMinutes ?? 12,
    ...createMetadata({ restaurantId: input.restaurantId ?? RESTAURANT_ID, branchId: input.branchId ?? BRANCH_ID }),
    createdAt: serverTimestamp() as KitchenOrderDoc["createdAt"],
    updatedAt: serverTimestamp() as KitchenOrderDoc["updatedAt"],
  };

  await setDoc(orderRef, order, { merge: true });
  return order;
}

export async function safeUpdateKitchenOrderStatus(
  orderId: string,
  status: KitchenOrderStatus,
  restaurantId = RESTAURANT_ID,
  branchId = BRANCH_ID,
) {
  if (!canUseOperationalFirestore()) return;
  await updateDoc(typedDoc<KitchenOrderDoc>(getFirebaseDb(), "kitchenOrders", orderId), {
    status,
    ...updateMetadata({ restaurantId, branchId }),
  });
}

export async function safeUpdateKitchenOrder(input: {
  id: string;
  restaurantId?: string;
  branchId?: string;
  orderType: KitchenOrderDoc["orderType"];
  source: KitchenOrderDoc["source"];
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  scheduledFor?: Date | string;
  waiterName?: string;
  lines: OrderLine[];
  taxSettings: TaxSettings;
  priority?: "normal" | "rush";
  etaMinutes?: number;
  status?: KitchenOrderStatus;
}) {
  if (!canUseOperationalFirestore()) return null;
  const subtotal = input.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const tax = calculateRestaurantTax({
    amount: subtotal,
    settings: input.taxSettings,
    packingCharge: input.orderType === "dine-in" ? 0 : input.taxSettings.defaultPackingCharge,
  });
  const patch = {
    orderType: input.orderType,
    source: input.source,
    tableNumber: input.tableNumber,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    deliveryAddress: input.deliveryAddress,
    scheduledFor: input.scheduledFor ? normalizeDate(input.scheduledFor) as KitchenOrderDoc["scheduledFor"] : undefined,
    waiterName: input.waiterName,
    status: input.status ?? "new",
    priority: input.priority ?? "normal",
    lines: input.lines.map((line) => ({
      menuItemId: line.itemId,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
      notes: line.notes,
    })),
    subtotal,
    tax: tax.gstAmount,
    total: tax.total,
    etaMinutes: input.etaMinutes ?? 12,
    ...updateMetadata({ restaurantId: input.restaurantId ?? RESTAURANT_ID, branchId: input.branchId ?? BRANCH_ID }),
    updatedAt: serverTimestamp(),
  } as Partial<KitchenOrderDoc>;
  await updateDoc(
    typedDoc<KitchenOrderDoc>(getFirebaseDb(), "kitchenOrders", input.id),
    Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<KitchenOrderDoc>,
  );
  return true;
}

export async function findCustomerByPhoneForPos(
  phone: string,
  restaurantId = RESTAURANT_ID,
) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || !canUseOperationalFirestore()) return null;

  const q = query(
    refs.customers(getFirebaseDb()),
    where("tenantId", "==", resolveTenantId(restaurantId)),
    where("normalizedPhone", "==", normalizedPhone),
    limit(1),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0]?.data() ?? null;
}

export async function safeUpsertCustomerFromBill(input: {
  bill: PosBill;
  total: number;
  restaurantId?: string;
  email?: string;
}) {
  const normalizedPhone = normalizePhone(input.bill.customerPhone ?? "");
  if (!input.bill.customerName || !normalizedPhone || !canUseOperationalFirestore()) return null;

  const restaurantId = input.restaurantId ?? RESTAURANT_ID;
  const customerId = `cust-${restaurantId}-${normalizedPhone}`;
  const previous = await findCustomerByPhoneForPos(normalizedPhone, restaurantId);
  const totalOrders = (previous?.totalOrders ?? 0) + 1;
  const lifetimeValue = (previous?.lifetimeValue ?? 0) + input.total;
  const customer: CustomerDoc = {
    id: customerId,
    tenantId: resolveTenantId(restaurantId),
    restaurantId,
    name: input.bill.customerName,
    phone: input.bill.customerPhone ?? normalizedPhone,
    normalizedPhone,
    email: input.email ?? previous?.email,
    loyaltyPoints: (previous?.loyaltyPoints ?? 0) + Math.floor(input.total / 100),
    tier: tierForValue(lifetimeValue),
    totalOrders,
    lifetimeValue,
    lastOrderAt: serverTimestamp() as CustomerDoc["lastOrderAt"],
    inactiveDays: 0,
    savedAddresses: previous?.savedAddresses ?? [],
    previousOrderIds: [
      input.bill.invoiceNumber ?? `INV-${Date.now()}`,
      ...(previous?.previousOrderIds ?? []),
    ].slice(0, 20),
    ...createMetadata({ restaurantId, branchId: BRANCH_ID }),
    createdAt: previous?.createdAt ?? (serverTimestamp() as CustomerDoc["createdAt"]),
    updatedAt: serverTimestamp() as CustomerDoc["updatedAt"],
  };

  await setDoc(typedDoc<CustomerDoc>(getFirebaseDb(), "customers", customerId), customer, { merge: true });
  return customer;
}

export function safeListenCustomers(
  restaurantId: string,
  onData: (customers: CustomerDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!canUseOperationalFirestore()) return () => undefined;
  const q = query(
    refs.customers(getFirebaseDb()),
    where("tenantId", "==", resolveTenantId(restaurantId)),
    orderBy("lifetimeValue", "desc"),
    limit(500),
  );
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((item) => item.data())), (error) => onError?.(error));
}

export async function safeRecordPosPayment(input: {
  bill: PosBill;
  branch: RestaurantBranch;
  taxSettings: TaxSettings;
  restaurantId?: string;
}) {
  if (!canUseOperationalFirestore()) return;

  const restaurantId = input.restaurantId ?? RESTAURANT_ID;
  const effectiveTaxSettings = effectiveTaxSettingsForBill(input.bill, input.taxSettings);
  const subtotal = input.bill.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const discount = input.bill.discount ?? 0;
  const tax = calculateRestaurantTax({
    amount: Math.max(0, subtotal - discount),
    settings: effectiveTaxSettings,
    packingCharge: packingChargeForBill(input.bill, input.taxSettings),
  });
  const invoiceNumber = input.bill.invoiceNumber ?? `INV-${Date.now()}`;
  const receiptId = `receipt-${invoiceNumber}`;
  const now = serverTimestamp();
  const receipt: ReceiptDoc = {
    id: receiptId,
    tenantId: resolveTenantId(restaurantId),
    restaurantId,
    branchId: input.branch.id,
    invoiceNumber,
    orderId: input.bill.linkedKitchenOrderId ?? invoiceNumber,
    cashier: input.bill.cashierName ?? "Cashier",
    paymentMethod: input.bill.payment,
    subtotal,
    taxBreakup: {
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
      serviceCharge: tax.serviceCharge,
      packingCharge: tax.packingCharge,
    },
    total: tax.total,
    ...createMetadata({ restaurantId, branchId: input.branch.id }),
    createdAt: now as ReceiptDoc["createdAt"],
    updatedAt: now as ReceiptDoc["updatedAt"],
  };
  const payment: PaymentTransactionDoc = {
    id: `pay-${invoiceNumber}`,
    tenantId: resolveTenantId(restaurantId),
    restaurantId,
    branchId: input.branch.id,
    receiptId,
    invoiceNumber,
    method: input.bill.payment === "card" ? "card" : input.bill.payment === "upi" ? "upi" : "cash",
    amount: tax.total,
    cashierId: input.bill.cashierName ?? "cashier",
    status: "paid",
    ...createMetadata({ restaurantId, branchId: input.branch.id }),
    createdAt: now as PaymentTransactionDoc["createdAt"],
    updatedAt: now as PaymentTransactionDoc["updatedAt"],
  };

  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.set(typedDoc<ReceiptDoc>(db, "receipts", receiptId), receipt, { merge: true });
  batch.set(typedDoc<PaymentTransactionDoc>(db, "paymentTransactions", payment.id), payment, { merge: true });
  if (input.bill.linkedKitchenOrderId) {
    batch.set(
      typedDoc<KitchenOrderDoc>(db, "kitchenOrders", input.bill.linkedKitchenOrderId),
      { paymentStatus: "paid", receiptId, ...updateMetadata({ restaurantId, branchId: input.branch.id }), updatedAt: now } as Partial<KitchenOrderDoc>,
      { merge: true },
    );
  }
  await batch.commit();
}

export async function safeSaveRestaurantSettings(settings: RestaurantSettingsDoc) {
  if (!canUseOperationalFirestore()) return settings;
  await setDoc(typedDoc<RestaurantSettingsDoc>(getFirebaseDb(), "restaurantSettings", settings.id), {
    ...settings,
    tenantId: resolveTenantId(settings),
    ...updateMetadata(settings),
  }, { merge: true });
  return settings;
}

function labelForOrderType(orderType: KitchenOrderDoc["orderType"]) {
  if (orderType === "takeaway") return "Takeaway";
  if (orderType === "parcel") return "Parcel";
  if (orderType === "delivery") return "Delivery";
  return "Direct";
}

function tierForValue(value: number): CustomerDoc["tier"] {
  if (value >= 50000) return "VIP";
  if (value >= 15000) return "Gold";
  if (value >= 5000) return "Silver";
  return "Regular";
}

function toIso(value: KitchenOrderDoc["createdAt"]) {
  return parseFirestoreDateIso(value) ?? new Date().toISOString();
}

function toIsoOptional(value?: KitchenOrderDoc["scheduledFor"]) {
  return parseFirestoreDateIso(value);
}

function normalizeDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}
