import {
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  increment,
  type DocumentSnapshot,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/firebase/client";
import { COLLECTIONS, refs, typedDoc } from "@/firebase/collections";
import { FIRESTORE_LIMITS } from "@/lib/constants";
import { parseFirestoreDateMillis } from "@/lib/firestore-date";
import { resolveTenantId } from "@/lib/tenant";
import { createMetadata, updateMetadata } from "@/services/firestore-metadata";
import { getPage, listenShared, listenToQueryShared } from "@/services/firestore-query";
import type { CustomerAddressDoc, MenuDoc, OrderDoc, OrderLineDoc, OrderStatus } from "@/types/firebase";

export type CreateOrderInput = {
  tenantId?: string;
  restaurantId: string;
  branchId?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryGeo?: { lat: number; lng: number };
  deliveryPlaceId?: string;
  deliveryAddressLabel?: string;
  channel: OrderDoc["channel"];
  lines: OrderLineDoc[];
  offerCode?: string;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  fulfillmentType?: "delivery" | "parcel" | "dine-in";
  scheduleMode?: "now" | "scheduled";
  scheduledFor?: Date | string;
  scheduledDateLabel?: string;
  scheduledSlotId?: string;
  prepEstimateMinutes?: number;
  cutoffAt?: Date | string;
  guestCount?: number;
  groupOrderId?: string;
  splitPayment?: boolean;
  acceptedTermsVersion?: string;
  acceptedTermsAt?: Date | string;
};

export async function createOrder(input: CreateOrderInput) {
  const db = getFirebaseDb();
  const orderRef = doc(refs.orders(db));
  const order: OrderDoc = {
    id: orderRef.id,
    ...input,
    tenantId: resolveTenantId(input),
    branchId: input.branchId,
    status: "new",
    paymentStatus: "pending",
    deliveryOtp: orderRef.id.slice(-4),
    fulfillmentType: input.fulfillmentType ?? "delivery",
    orderType: input.fulfillmentType ?? "delivery",
    scheduleMode: input.scheduleMode ?? "now",
    scheduledFor: normalizeOrderDate(input.scheduledFor) as OrderDoc["scheduledFor"],
    scheduledDateLabel: input.scheduledDateLabel,
    scheduledSlotId: input.scheduledSlotId,
    scheduledStatus: input.scheduleMode === "scheduled" ? "requested" : undefined,
    prepEstimateMinutes: input.prepEstimateMinutes,
    cutoffAt: normalizeOrderDate(input.cutoffAt) as OrderDoc["cutoffAt"],
    guestCount: input.guestCount,
    groupOrderId: input.groupOrderId,
    splitPayment: input.splitPayment,
    acceptedTermsVersion: input.acceptedTermsVersion,
    acceptedTermsAt: normalizeOrderDate(input.acceptedTermsAt) as OrderDoc["acceptedTermsAt"],
    ...createMetadata(input),
    createdAt: serverTimestamp() as OrderDoc["createdAt"],
    updatedAt: serverTimestamp() as OrderDoc["updatedAt"],
  };

  // Batched write avoids transaction overhead. Inventory reservation can be
  // added to this same batch later or moved into a Cloud Function.
  const batch = writeBatch(db);
  batch.set(orderRef, order);
  batch.set(typedDoc<OrderDoc>(db, COLLECTIONS.customerOrders, orderRef.id), order);
  for (const line of input.lines) {
    if (line.menuItemId && line.quantity > 0) {
      const countPatch = { orderCount: increment(line.quantity), updatedAt: serverTimestamp() } as unknown as Partial<MenuDoc>;
      batch.set(typedDoc<MenuDoc>(db, COLLECTIONS.menus, line.menuItemId), countPatch, { merge: true });
      batch.set(typedDoc<MenuDoc>(db, COLLECTIONS.menuItems, line.menuItemId), countPatch, { merge: true });
    }
  }
  if (
    input.deliveryAddress &&
    typeof input.deliveryGeo?.lat === "number" &&
    typeof input.deliveryGeo.lng === "number"
  ) {
    const addressId = `${input.customerId}-default`;
    const address: CustomerAddressDoc = {
      id: addressId,
      customerId: input.customerId,
      label: input.deliveryAddressLabel ?? "Default",
      address: input.deliveryAddress,
      fullAddress: input.deliveryAddress,
      geo: input.deliveryGeo,
      latitude: input.deliveryGeo.lat,
      longitude: input.deliveryGeo.lng,
      placeId: input.deliveryPlaceId,
      verified: true,
      isDefault: true,
      ...createMetadata(input),
      createdAt: serverTimestamp() as CustomerAddressDoc["createdAt"],
      updatedAt: serverTimestamp() as CustomerAddressDoc["updatedAt"],
    };
    batch.set(typedDoc<CustomerAddressDoc>(db, COLLECTIONS.customerAddresses, addressId), address, { merge: true });
  }
  await batch.commit();

  return order;
}

function normalizeOrderDate(value?: Date | string) {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

export async function createOrderWithRetry(input: CreateOrderInput, attempts = 2) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await createOrder(input);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  throw lastError;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const db = getFirebaseDb();
  await updateDoc(typedDoc<OrderDoc>(db, "orders", orderId), {
    status,
    ...updateMetadata(),
  });
}

export function listenToOrder(
  orderId: string,
  callback: (order: OrderDoc | null) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  return listenShared<OrderDoc | null>(
    `order:${orderId}`,
    (emit) =>
      onSnapshot(typedDoc<OrderDoc>(db, "orders", orderId), (snapshot) => {
        emit(snapshot.exists() ? snapshot.data() : null);
      }, () => {
        emit(null);
      }),
    callback,
  );
}

export function listenToRestaurantOrders(
  restaurantId: string,
  statuses: OrderStatus[],
  callback: (orders: OrderDoc[]) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const activeStatuses = statuses.slice(0, 10);
  const tenantId = resolveTenantId(restaurantId);
  const scopedResults = new Map<string, OrderDoc[]>();
  const emit = () => {
    callback(dedupeAndSortOrders([...scopedResults.values()].flat()).slice(0, FIRESTORE_LIMITS.restaurantOrders));
  };
  const tenantQuery = query(
    refs.orders(db),
    where("tenantId", "==", tenantId),
    where("status", "in", activeStatuses),
    orderBy("createdAt", "desc"),
    limit(FIRESTORE_LIMITS.restaurantOrders),
  );
  const unsubscribers: Unsubscribe[] = [
    listenToQueryShared(
      `restaurant-orders:tenant:${tenantId}:${activeStatuses.join(",")}`,
      tenantQuery,
      (orders) => {
        scopedResults.set("tenant", orders);
        emit();
      },
    ),
  ];

  if (restaurantId !== tenantId) {
    const restaurantQuery = query(
      refs.orders(db),
      where("restaurantId", "==", restaurantId),
      where("status", "in", activeStatuses),
      orderBy("createdAt", "desc"),
      limit(FIRESTORE_LIMITS.restaurantOrders),
    );
    unsubscribers.push(
      listenToQueryShared(
        `restaurant-orders:restaurant:${restaurantId}:${activeStatuses.join(",")}`,
        restaurantQuery,
        (orders) => {
          scopedResults.set("restaurant", orders);
          emit();
        },
      ),
    );
  }

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

function dedupeAndSortOrders(orders: OrderDoc[]) {
  return Array.from(new Map(orders.map((order) => [order.id, order])).values()).sort(
    (first, second) => orderCreatedAtMs(second.createdAt) - orderCreatedAtMs(first.createdAt),
  );
}

function orderCreatedAtMs(value: unknown) {
  return parseFirestoreDateMillis(value);
}

export async function getOrderHistory(
  customerId: string,
  pageSize = FIRESTORE_LIMITS.orderHistory,
  cursor?: DocumentSnapshot<OrderDoc>,
) {
  const db = getFirebaseDb();
  const constraints: QueryConstraint[] = [
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
  ];
  const page = await getPage(refs.orders(db), constraints, pageSize, cursor);

  return {
    orders: page.items,
    cursor: page.cursor,
    hasMore: page.hasMore,
  };
}

export async function createWhatsappDraftOrder(input: CreateOrderInput) {
  const order = await createOrder({ ...input, channel: "whatsapp" });
  await setDoc(
    typedDoc<OrderDoc>(getFirebaseDb(), "orders", order.id),
    {
      ...order,
      tenantId: resolveTenantId(order),
      paymentStatus: "pending",
      ...updateMetadata(order),
      updatedAt: serverTimestamp() as OrderDoc["updatedAt"],
    },
    { merge: true },
  );
  return order;
}
