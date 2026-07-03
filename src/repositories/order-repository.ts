import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { parseFirestoreDateMillis } from "@/lib/firestore-date";
import { resolveTenantId } from "@/lib/tenant";
import type { MenuDoc, OfferDoc, OrderDoc, OrderLineDoc, PaymentStatus, RestaurantDoc } from "@/types/firebase";
import { CustomerRepository } from "@/repositories/customer-repository";
import { dataWithId, dateMs, readTenantDocs, type TenantScope } from "@/repositories/shared";
import type { PosBill } from "@/lib/types";

type PosDraftInput = {
  bill: PosBill;
  deliveryAddress?: string;
  landmark?: string;
  orderNote?: string;
};

type PaymentInput = {
  orderId: string;
  kitchenOrderId?: string;
  amount: number;
  method: "cash" | "upi" | "card" | "credit";
  reference?: string;
  cashierId?: string;
};

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
    const normalizedOrder = withOrderConsistency(order);
    await this.db.runTransaction(async (transaction) => {
      const customer = await this.customers.prepareOrderUpsert(transaction, normalizedOrder);
      const now = new Date();
      transaction.set(this.db.collection("orders").doc(normalizedOrder.id), normalizedOrder);
      transaction.set(this.db.collection("customerOrders").doc(normalizedOrder.id), normalizedOrder);
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
    return normalizedOrder;
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

  async list(scope: TenantScope, options: { from?: Date; to?: Date; limit?: number; includeDrafts?: boolean } = {}) {
    const rows = (await readTenantDocs(this.db, "orders", scope, ["tenantId", "restaurantId"], options.limit ?? 1_000))
      .map((doc) => dataWithId<OrderDoc>(doc.id, doc.data()))
      .filter((order) => options.includeDrafts || order.status !== "draft")
      .filter((order) => !options.from || dateMs(order.createdAt) >= options.from.getTime())
      .filter((order) => !options.to || dateMs(order.createdAt) <= options.to.getTime())
      .sort((first, second) => dateMs(second.createdAt) - dateMs(first.createdAt));
    return rows;
  }

  async getPosDraft(scope: TenantScope) {
    const snapshot = await this.db.collection("orders").doc(posDraftId(scope)).get();
    if (!snapshot.exists) return null;
    const draft = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
    return draft.status === "draft" && [draft.tenantId, draft.restaurantId].includes(scope.tenantId) ? draft : null;
  }

  async savePosDraft(scope: TenantScope, input: PosDraftInput) {
    if (!input.bill.lines.length) {
      await this.deletePosDraft(scope);
      return null;
    }
    const ref = this.db.collection("orders").doc(posDraftId(scope));
    const now = new Date();
    const subtotal = money(input.bill.lines.reduce((sum, line) => sum + Number(line.price ?? 0) * Number(line.quantity ?? 0), 0));
    const discount = money(input.bill.discount);
    const total = Math.max(0, subtotal - discount);
    const deliveryAddress = [input.deliveryAddress, input.landmark].map((part) => part?.trim()).filter(Boolean).join(", ");
    const draft: OrderDoc = {
      id: ref.id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      customerId: input.bill.customerId || `pos-draft:${scope.tenantId}`,
      customerName: input.bill.customerName || "Walk-in customer",
      customerPhone: input.bill.customerPhone || "",
      ...(deliveryAddress ? { deliveryAddress } : {}),
      channel: "pos",
      orderSource: "POS",
      status: "draft",
      foodStatus: "new",
      lines: input.bill.lines.map((line) => ({
        menuItemId: line.itemId,
        name: line.name,
        price: money(line.price),
        quantity: Math.max(1, Math.floor(Number(line.quantity) || 1)),
        ...(input.orderNote?.trim() ? { notes: input.orderNote.trim() } : {}),
      })),
      subtotal,
      discount,
      tax: 0,
      deliveryFee: input.bill.orderType === "delivery" ? 0 : 0,
      total,
      paymentStatus: input.bill.paid ? "paid" : "pending",
      statusHistory: [{ status: "draft", foodStatus: "new", paymentStatus: input.bill.paid ? "paid" : "pending", at: now, by: scope.uid }],
      printedCount: 0,
      lastPrintedAt: null,
      deliveryOtp: "",
      orderType: input.bill.orderType,
      tableNumber: input.bill.table,
      waiterName: input.bill.waiterName,
      fulfillmentType: input.bill.orderType === "delivery" ? "delivery" : input.bill.orderType === "dine-in" ? "dine-in" : "parcel",
      scheduleMode: "now",
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(draft, { merge: true });
    return dataWithId<OrderDoc>(ref.id, (await ref.get()).data() ?? draft);
  }

  async deletePosDraft(scope: TenantScope) {
    await this.db.collection("orders").doc(posDraftId(scope)).delete();
  }

  async placePosDraft(scope: TenantScope, input: { kitchenOrderId: string }) {
    const draftRef = this.db.collection("orders").doc(posDraftId(scope));
    const orderRef = this.db.collection("orders").doc();
    const now = new Date();
    let placed: OrderDoc | null = null;
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(draftRef);
      if (!snapshot.exists) throw new Error("POS draft not found.");
      const draft = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      if (draft.status !== "draft" || ![draft.tenantId, draft.restaurantId].includes(scope.tenantId)) throw new Error("POS draft is outside the active restaurant.");
      placed = {
        ...draft,
        id: orderRef.id,
        status: "new",
        kitchenOrderId: input.kitchenOrderId,
        invoiceNumber: `INV-${orderRef.id.slice(-8).toUpperCase()}`,
        statusHistory: [
          ...(draft.statusHistory ?? []),
          { status: "new", foodStatus: "new", paymentStatus: draft.paymentStatus ?? "pending", at: now, by: scope.uid },
        ],
        updatedAt: now,
      };
      transaction.set(orderRef, placed);
      transaction.set(this.db.collection("customerOrders").doc(orderRef.id), placed);
      transaction.delete(draftRef);
    });
    return placed!;
  }

  async recordPayment(scope: TenantScope, input: PaymentInput) {
    const orderRef = this.db.collection("orders").doc(input.orderId);
    const customerOrderRef = this.db.collection("customerOrders").doc(input.orderId);
    const paymentRef = this.db.collection("paymentTransactions").doc();
    const now = new Date();
    let nextStatus: PaymentStatus = "pending";
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("This order is outside the active restaurant.");
      const previousPaid = paidAmount(order);
      const amount = money(input.amount);
      const paidTotal = previousPaid + amount;
      nextStatus = paidTotal <= 0 ? "pending" : paidTotal + 0.01 < Number(order.total ?? 0) ? "partial" : "paid";
      const paymentPatch = {
        paymentStatus: nextStatus,
        paidAmount: paidTotal,
        splitPayment: nextStatus === "partial" || Boolean(order.splitPayment),
        statusHistory: FieldValue.arrayUnion({ paymentStatus: nextStatus, at: now, by: scope.uid }),
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.set(orderRef, paymentPatch, { merge: true });
      transaction.set(customerOrderRef, paymentPatch, { merge: true });
      if (input.kitchenOrderId) transaction.set(this.db.collection("kitchenOrders").doc(input.kitchenOrderId), { paymentStatus: nextStatus, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(paymentRef, {
        id: paymentRef.id,
        tenantId: scope.tenantId,
        restaurantId: scope.tenantId,
        branchId: order.branchId ?? scope.branchIds?.[0] ?? "main",
        receiptId: input.orderId,
        invoiceNumber: order.invoiceNumber ?? input.orderId,
        orderId: input.orderId,
        method: input.method,
        amount,
        reference: input.reference ?? "",
        cashierId: input.cashierId ?? scope.uid ?? "",
        status: nextStatus === "paid" || nextStatus === "partial" ? "paid" : "authorized",
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    const updated = await orderRef.get();
    return { order: dataWithId<OrderDoc>(updated.id, updated.data() ?? {}), paymentStatus: nextStatus };
  }

  async recordPrint(scope: TenantScope, orderId: string, type: "bill" | "kot", userId?: string) {
    const ref = this.db.collection("orders").doc(orderId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("Order not found.");
    const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
    if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("This order is outside the active restaurant.");
    const patch = {
      printedCount: FieldValue.increment(1),
      lastPrintedAt: FieldValue.serverTimestamp(),
      statusHistory: FieldValue.arrayUnion({ status: order.status, at: new Date(), by: userId ?? scope.uid, event: `${type}_printed` }),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await Promise.all([
      ref.set(patch, { merge: true }),
      this.db.collection("customerOrders").doc(orderId).set(patch, { merge: true }),
    ]);
    return { ...order, printedCount: Number(order.printedCount ?? 0) + 1 };
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
    const now = new Date();
    let nextOrder: OrderDoc | null = null;
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("This order is outside the active restaurant.");
      const actorPatch = status === "preparing"
        ? { preparedBy: scope.uid ?? "" }
        : status === "served"
          ? { servedBy: scope.uid ?? "" }
          : ["delivered", "completed"].includes(status)
            ? { completedBy: scope.uid ?? "" }
            : {};
      const statusPatch = {
        status,
        foodStatus: orderStatusToFoodStatus(status),
        statusHistory: FieldValue.arrayUnion({ status, foodStatus: orderStatusToFoodStatus(status), at: now, by: scope.uid }),
        updatedAt: FieldValue.serverTimestamp(),
        ...actorPatch,
      };
      transaction.set(ref, statusPatch, { merge: true });
      transaction.set(this.db.collection("customerOrders").doc(orderId), statusPatch, { merge: true });
      nextOrder = { ...order, status };
    });
    return nextOrder!;
  }
}

function withOrderConsistency(order: OrderDoc): OrderDoc {
  const now = new Date();
  const foodStatus = order.foodStatus ?? orderStatusToFoodStatus(order.status);
  return {
    ...order,
    foodStatus,
    paymentStatus: order.paymentStatus ?? "pending",
    statusHistory: order.statusHistory?.length
      ? order.statusHistory
      : [{ status: order.status, foodStatus, paymentStatus: order.paymentStatus ?? "pending", at: order.createdAt ?? now, by: order.customerId }],
    preparedBy: order.preparedBy ?? "",
    servedBy: order.servedBy ?? "",
    completedBy: order.completedBy ?? "",
    printedCount: Number(order.printedCount ?? 0),
    lastPrintedAt: order.lastPrintedAt ?? null,
    createdAt: order.createdAt ?? now,
    updatedAt: order.updatedAt ?? now,
  };
}

function orderStatusToFoodStatus(status: OrderDoc["status"]) {
  if (status === "draft") return "new";
  if (status === "accepted") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready" || status === "picked-up") return "ready";
  if (status === "served" || status === "delivered") return "served";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "rejected") return "cancelled";
  return "new";
}

function money(value?: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round((value as number) * 100) / 100) : 0;
}

function posDraftId(scope: TenantScope) {
  return `pos-draft-${scope.tenantId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function paidAmount(order: OrderDoc) {
  const value = (order as OrderDoc & { paidAmount?: number }).paidAmount;
  return Number.isFinite(value) ? Number(value) : order.paymentStatus === "paid" ? Number(order.total ?? 0) : 0;
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
