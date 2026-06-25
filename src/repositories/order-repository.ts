import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { parseFirestoreDateMillis } from "@/lib/firestore-date";
import { resolveTenantId } from "@/lib/tenant";
import type { MenuDoc, OfferDoc, OrderDoc, OrderLineDoc, RestaurantDoc } from "@/types/firebase";
import { CustomerRepository } from "@/repositories/customer-repository";
import { dataWithId, dateMs, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class OrderRepository {
  private readonly db = adminDb();
  private readonly customers = new CustomerRepository();

  newOrderId() {
    return this.db.collection("orders").doc().id;
  }

  async restaurant(restaurantId: string) {
    const snapshot = await this.db.collection("restaurants").doc(restaurantId).get();
    return snapshot.exists ? ({ id: snapshot.id, ...snapshot.data() } as RestaurantDoc) : null;
  }

  async create(order: OrderDoc, address?: Record<string, unknown>) {
    await this.db.runTransaction(async (transaction) => {
      const customer = await this.customers.prepareOrderUpsert(transaction, order);
      const now = new Date();
      transaction.set(this.db.collection("orders").doc(order.id), order);
      transaction.set(this.db.collection("customerOrders").doc(order.id), order);
      transaction.set(customer.customerRef, customer.customer, { merge: true });
      transaction.set(customer.loyalty.loyaltyRef, customer.loyalty.loyalty, { merge: true });
      transaction.set(customer.loyalty.transactionRef, customer.loyalty.transaction, { merge: true });
      for (const line of order.lines) {
        if (!line.menuItemId || line.quantity <= 0) continue;
        const patch = { orderCount: FieldValue.increment(line.quantity), updatedAt: now };
        transaction.set(this.db.collection("menus").doc(line.menuItemId), patch, { merge: true });
        transaction.set(this.db.collection("menuItems").doc(line.menuItemId), patch, { merge: true });
      }
      if (address) transaction.set(this.db.collection("customerAddresses").doc(String(address.id)), address, { merge: true });
    });
    return order;
  }

  async resolveOrderLines(restaurantId: string, fulfillmentType: "delivery" | "parcel" | "dine-in", lines: OrderLineDoc[]) {
    const ids = Array.from(new Set(lines.map((line) => line.menuItemId)));
    const primary = await this.db.getAll(...ids.map((id) => this.db.collection("menus").doc(id)));
    const missing = primary.filter((doc) => !doc.exists).map((doc) => doc.id);
    const legacy = missing.length ? await this.db.getAll(...missing.map((id) => this.db.collection("menuItems").doc(id))) : [];
    const docs = new Map([...primary, ...legacy].filter((doc) => doc.exists).map((doc) => [doc.id, doc.data() as MenuDoc]));

    const resolved: OrderLineDoc[] = [];
    for (const line of lines) {
      const item = docs.get(line.menuItemId);
      if (!item || item.isDeleted || item.available === false) return null;
      const itemRestaurant = resolveTenantId(item.tenantId || item.restaurantId);
      if (itemRestaurant !== restaurantId) return null;
      const channel = item.channelConfig?.[fulfillmentType];
      if (channel?.visible === false || channel?.available === false || item.menuVisibility?.[fulfillmentType] === false) return null;
      const price = money(channel?.price ?? (fulfillmentType === "dine-in" ? item.dineInPrice : fulfillmentType === "parcel" ? item.parcelPrice : item.deliveryPrice) ?? item.price);
      if (price <= 0) return null;
      resolved.push({ menuItemId: line.menuItemId, name: item.name, price, quantity: Math.min(100, Math.floor(line.quantity)), ...(line.notes ? { notes: line.notes } : {}) });
    }
    return resolved;
  }

  async countScheduledOrdersForSlot(scheduledSlotId: string) {
    const snapshot = await this.db
      .collection("orders")
      .where("scheduledSlotId", "==", scheduledSlotId)
      .limit(100)
      .get();

    return snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.status !== "cancelled" && data.scheduledStatus !== "rejected";
    }).length;
  }

  async validateOffer(input: {
    restaurantId: string;
    offerCode?: string;
    subtotal: number;
    fulfillmentType: "delivery" | "parcel" | "dine-in";
    lines: OrderLineDoc[];
  }) {
    if (!input.offerCode) return { ok: true as const };
    const snapshot = await this.db
      .collection("offers")
      .where("restaurantId", "==", input.restaurantId)
      .where("code", "==", input.offerCode)
      .limit(1)
      .get();
    const doc = snapshot.docs[0]?.data() as OfferDoc | undefined;
    if (!doc || doc.isDeleted || !doc.active || (doc.status && doc.status !== "active")) {
      return { ok: false as const, error: "This offer is no longer active." };
    }
    if (!isOfferDateValid(doc)) {
      return { ok: false as const, error: "This offer is not valid for the current date or time." };
    }
    if (input.subtotal < (doc.minimumOrder ?? 0)) {
      return { ok: false as const, error: `Minimum order for this offer is ₹${doc.minimumOrder}.` };
    }
    if (doc.appliesTo?.length && !doc.appliesTo.includes(input.fulfillmentType)) {
      return { ok: false as const, error: "This offer is not valid for the selected order type." };
    }
    if (doc.applicableItemIds?.length && !input.lines.some((line) => doc.applicableItemIds?.includes(line.menuItemId))) {
      return { ok: false as const, error: "This offer does not apply to the selected items." };
    }

    const rawDiscount =
      doc.discountType === "flat"
        ? Math.min(input.subtotal, doc.discountValue)
        : doc.discountType === "free-delivery"
          ? 0
          : Math.round(input.subtotal * ((doc.discountValue ?? 0) / 100));
    const discount = doc.maxDiscount ? Math.min(rawDiscount, doc.maxDiscount) : rawDiscount;
    return { ok: true as const, offerCode: input.offerCode, discount, freeDelivery: doc.discountType === "free-delivery" };
  }

  async list(scope: TenantScope, options: { from?: Date; to?: Date; limit?: number } = {}) {
    const rows = (await readTenantDocs(this.db, "orders", scope, ["tenantId", "restaurantId"], options.limit ?? 1_000))
      .map((doc) => dataWithId<OrderDoc>(doc.id, doc.data()))
      .filter((order) => !options.from || dateMs(order.createdAt) >= options.from.getTime())
      .filter((order) => !options.to || dateMs(order.createdAt) <= options.to.getTime())
      .sort((first, second) => dateMs(second.createdAt) - dateMs(first.createdAt));
    return rows;
  }

  async listForCustomer(customerId: string, limit = 50) {
    const snapshot = await this.db.collection("customerOrders").where("customerId", "==", customerId).limit(limit).get();
    return snapshot.docs
      .map((doc) => dataWithId<OrderDoc>(doc.id, doc.data()))
      .sort((first, second) => dateMs(second.createdAt) - dateMs(first.createdAt));
  }

  async getForCustomer(customerId: string, orderId: string) {
    const snapshot = await this.db.collection("customerOrders").doc(orderId).get();
    if (!snapshot.exists) return null;
    const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
    return order.customerId === customerId ? order : null;
  }

  async summary(scope: TenantScope, options: { from?: Date; to?: Date } = {}) {
    const orders = await this.list(scope, options);
    const billable = orders.filter((order) => !["cancelled", "rejected"].includes(order.status));
    const revenue = billable.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
    const tax = billable.reduce((sum, order) => sum + Number(order.tax ?? 0), 0);
    const active = orders.filter((order) => !["cancelled", "rejected", "delivered", "completed"].includes(order.status));
    return { orders, orderCount: orders.length, billableOrderCount: billable.length, revenue, tax, activeOrderCount: active.length };
  }

  async updateStatus(scope: TenantScope, orderId: string, status: OrderDoc["status"]) {
    const ref = this.db.collection("orders").doc(orderId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("Order not found.");
    const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
    if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("This order is outside the active restaurant.");
    await Promise.all([
      ref.set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      this.db.collection("customerOrders").doc(orderId).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    ]);
    return { ...order, status };
  }
}

function money(value?: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round((value as number) * 100) / 100) : 0;
}

function isOfferDateValid(doc: OfferDoc) {
  const now = new Date();
  const startsAt = dateMillis(doc.startsAt);
  const endsAt = dateMillis(doc.endsAt);
  if (startsAt && startsAt > now.getTime()) return false;
  if (endsAt && endsAt < now.getTime()) return false;
  if (doc.daysOfWeek?.length) {
    const day = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
    if (!doc.daysOfWeek.map((item) => item.toLowerCase().slice(0, 3)).includes(day)) return false;
  }
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (doc.startTime && currentTime < doc.startTime) return false;
  if (doc.endTime && currentTime > doc.endTime) return false;
  return true;
}

function dateMillis(value: unknown) {
  return parseFirestoreDateMillis(value);
}
