import "server-only";

import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { parseFirestoreDateMillis } from "@/lib/firestore-date";
import {
  assertCanCorrectBill,
  assertCanRecordPayment,
  assertCanRefund,
  assertCanStartPayment,
  assertLegalOrderTransition,
  orderStatusToFoodStatus,
  statusEventForTransition,
} from "@/lib/order-state-machine";
import { hasOperationKey } from "@/lib/server/operation-idempotency";
import { dispatchPendingTenantPushNotifications } from "@/lib/server/push-notifications";
import { productionLogger, safeErrorName } from "@/lib/server/production-logger";
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
  role?: string;
  device?: string;
  provider?: "razorpay" | "manual";
  providerPaymentId?: string;
  providerOrderId?: string;
  providerRefundId?: string;
  gatewayStatus?: string;
  failureReason?: string;
  capturedAt?: Date;
  reason?: string;
  operationKey?: string;
};

type PaymentMethod = PaymentInput["method"];

type ActorInput = {
  userId?: string;
  role?: string;
  device?: string;
  ip?: string;
  note?: string;
  operationKey?: string;
};

type PrintInput = ActorInput & {
  orderId: string;
  type: "bill" | "kot" | "receipt";
};

export type OperationalEvent =
  | "order_created"
  | "item_added"
  | "item_removed"
  | "discount"
  | "coupon"
  | "kitchen_sent"
  | "kitchen_accepted"
  | "kitchen_ready"
  | "reminder"
  | "payment"
  | "completion"
  | "split_bill"
  | "transfer_table"
  | "assign_waiter"
  | "merge_tables"
  | "kitchen_recall"
  | "payment_started"
  | "payment_unlock"
  | "bill_correction";

type OperationalEventInput = ActorInput & {
  orderId: string;
  kitchenOrderId?: string;
  event: OperationalEvent;
  amount?: number;
  method?: string;
  note?: string;
};

type SplitBillInput = ActorInput & {
  orderId: string;
  kitchenOrderId?: string;
  splits: Array<{
    id?: string;
    customerName?: string;
    amount: number;
    method: PaymentMethod;
    basis?: "item" | "quantity" | "percentage" | "custom";
    itemId?: string;
    quantity?: number;
    percent?: number;
    receipt?: boolean;
    note?: string;
  }>;
};

type TransferTableInput = ActorInput & {
  orderId: string;
  kitchenOrderId?: string;
  tableNumber?: string;
  waiterName?: string;
  mode?: "table" | "waiter";
};

type MergeTablesInput = ActorInput & {
  orderId: string;
  kitchenOrderId?: string;
  sourceOrderIds: string[];
  sourceKitchenOrderIds?: string[];
  tableNumber?: string;
};

type CorrectionLineInput = {
  itemId?: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

type BillCorrectionInput = ActorInput & {
  orderId: string;
  reason: string;
  lines: CorrectionLineInput[];
  discount?: number;
  tax?: number;
  packingCharge?: number;
  deliveryFee?: number;
  total?: number;
};

type PaymentLockInput = ActorInput & {
  orderId: string;
  kitchenOrderId?: string;
  amount?: number;
  method?: PaymentMethod;
  reason?: string;
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
    const scope = { tenantId: normalizedOrder.tenantId || resolveTenantId(normalizedOrder.restaurantId) };
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
      writeNotification(transaction, scope, {
        type: "new_order",
        title: "New online order",
        message: `${normalizedOrder.customerName || "Customer"} placed an order for ₹${money(normalizedOrder.total)}.`,
        priority: "high",
        orderId: normalizedOrder.id,
        kitchenOrderId: normalizedOrder.kitchenOrderId,
      });
      if (address) transaction.set(this.db.collection("customerAddresses").doc(String(address.id)), address, { merge: true });
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
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
      .filter((order) => matchesDateRange(order, options.from, options.to))
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
    const previousSnapshot = await ref.get();
    const previousDraft = previousSnapshot.exists ? dataWithId<OrderDoc>(previousSnapshot.id, previousSnapshot.data() ?? {}) : null;
    const draftEvents = draftAuditEvents(previousDraft, input.bill, scope, now);
    const previousStatusHistory = previousDraft?.statusHistory ?? [];
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
      statusHistory: [
        ...(previousStatusHistory.length ? previousStatusHistory : [{ status: "draft" as const, foodStatus: "new" as const, paymentStatus: input.bill.paid ? "paid" as const : "pending" as const, at: now, by: scope.uid }]),
        ...draftEvents.map((event) => ({ event: String(event.type), at: now, by: scope.uid })),
      ],
      auditTimeline: [
        ...auditTimelineOf(previousDraft),
        ...draftEvents,
      ],
      printedCount: 0,
      lastPrintedAt: null,
      deliveryOtp: "",
      orderType: input.bill.orderType ?? "dine-in",
      tableNumber: input.bill.table || "DIRECT",
      waiterName: input.bill.waiterName ?? "",
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
    const kitchenRef = this.db.collection("kitchenOrders").doc(input.kitchenOrderId);
    const orderRef = this.db.collection("orders").doc();
    const now = new Date();
    let placed: OrderDoc | null = null;
    await this.db.runTransaction(async (transaction) => {
      const [snapshot, kitchenSnapshot] = await Promise.all([transaction.get(draftRef), transaction.get(kitchenRef)]);
      if (!snapshot.exists) throw new Error("POS draft not found.");
      if (!kitchenSnapshot.exists) throw new Error("Kitchen ticket not found.");
      const kitchen = kitchenSnapshot.data() ?? {};
      if (![kitchen.tenantId, kitchen.restaurantId].includes(scope.tenantId)) throw new Error("Kitchen ticket not found.");
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
          { event: "order_created", at: now, by: scope.uid },
          { event: "kitchen_sent", at: now, by: scope.uid },
        ],
        auditTimeline: [
          ...auditTimelineOf(draft),
          auditEvent("order_created", scope, { userId: scope.uid }, now),
          auditEvent("kitchen_sent", scope, { userId: scope.uid }, now),
        ],
        updatedAt: now,
      };
      transaction.set(orderRef, placed);
      transaction.set(this.db.collection("customerOrders").doc(orderRef.id), placed);
      writeAudit(transaction, scope, {
        userId: scope.uid,
        action: "order_created",
        entityId: orderRef.id,
        after: { kitchenOrderId: input.kitchenOrderId, total: draft.total },
      });
      writeAudit(transaction, scope, {
        userId: scope.uid,
        action: "kitchen_sent",
        entityId: orderRef.id,
        after: { kitchenOrderId: input.kitchenOrderId },
      });
      writeNotification(transaction, scope, {
        type: "new_order",
        title: "New order",
        message: `${draft.tableNumber || draft.orderType || "POS"} order sent to kitchen.`,
        priority: "high",
        orderId: orderRef.id,
        kitchenOrderId: input.kitchenOrderId,
      });
      transaction.delete(draftRef);
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
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
      const kitchenRef = input.kitchenOrderId ? this.db.collection("kitchenOrders").doc(input.kitchenOrderId) : null;
      const kitchenSnapshot = kitchenRef ? await transaction.get(kitchenRef) : null;
      if (kitchenRef && !kitchenSnapshot?.exists) throw new Error("Kitchen ticket not found.");
      const kitchen = kitchenSnapshot?.data() ?? {};
      if (kitchenRef && ![kitchen.tenantId, kitchen.restaurantId].includes(scope.tenantId)) throw new Error("Kitchen ticket not found.");
      if (hasOperationKey(order, input.operationKey)) {
        nextStatus = order.paymentStatus ?? "pending";
        return;
      }
      assertCanRecordPayment(order);
      assertPaymentLockOwner(order, input.cashierId);
      const previousPaid = paidAmount(order);
      const amount = money(input.amount);
      if (order.paymentStatus === "paid" || previousPaid + 0.01 >= Number(order.total ?? 0)) throw new Error("Payment has already been collected.");
      const paidTotal = previousPaid + amount;
      nextStatus = paidTotal <= 0 ? "pending" : paidTotal + 0.01 < Number(order.total ?? 0) ? "partial" : "paid";
      const balanceDue = Math.max(0, money(Number(order.total ?? 0) - paidTotal));
      const gatewayDetails = {
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        providerOrderId: input.providerOrderId,
        gatewayStatus: input.gatewayStatus,
        capturedAt: input.capturedAt,
      };
      const timeline = [
        ...(previousPaid <= 0 ? [paymentEvent("payment_started", scope, input, now, { balanceDue: Number(order.total ?? 0) })] : []),
        paymentEvent(nextStatus === "paid" ? "payment_completed" : "partial_payment", scope, input, now, { balanceDue, ...gatewayDetails }),
      ];
      const audit = timeline.map((entry) => auditEvent(String(entry.type), scope, input, now, { amount, method: input.method, balanceDue, ...gatewayDetails }));
      const paymentPatch = {
        paymentStatus: nextStatus,
        paidAmount: paidTotal,
        splitPayment: nextStatus === "partial" || Boolean(order.splitPayment),
        paymentLock: cleanRecord({
          locked: false,
          completedAt: now,
          by: input.cashierId ?? scope.uid ?? "",
          role: input.role,
          device: input.device,
          method: input.method,
          amount,
        }),
        paymentTimeline: FieldValue.arrayUnion(...timeline),
        auditTimeline: FieldValue.arrayUnion(...audit),
        statusHistory: FieldValue.arrayUnion(...timeline.map((entry) => ({ event: String(entry.type), paymentStatus: nextStatus, at: now, by: input.cashierId ?? scope.uid }))),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      };
      transaction.set(orderRef, paymentPatch, { merge: true });
      transaction.set(customerOrderRef, paymentPatch, { merge: true });
      if (kitchenRef) transaction.set(kitchenRef, { paymentStatus: nextStatus, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(paymentRef, cleanRecord({
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
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        providerOrderId: input.providerOrderId,
        gatewayStatus: input.gatewayStatus,
        capturedAt: input.capturedAt,
        createdAt: FieldValue.serverTimestamp(),
      }));
      if (nextStatus === "paid") {
        const printRef = this.db.collection("printLogs").doc();
        transaction.set(printRef, cleanRecord({
          id: printRef.id,
          tenantId: scope.tenantId,
          restaurantId: scope.tenantId,
          orderId: input.orderId,
          type: "receipt",
          status: "queued",
          printedBy: input.cashierId ?? scope.uid ?? "",
          device: input.device,
          createdAt: FieldValue.serverTimestamp(),
        }));
      }
      for (const entry of audit) writeAudit(transaction, scope, { userId: input.cashierId ?? scope.uid, role: input.role, action: String(entry.type), entityId: input.orderId, after: entry, device: input.device });
      writeNotification(transaction, scope, {
        type: "payment",
        title: nextStatus === "paid" ? "Payment completed" : "Partial payment",
        message: `${input.method.toUpperCase()} payment of ₹${amount} recorded.`,
        priority: nextStatus === "paid" ? "normal" : "high",
        orderId: input.orderId,
        kitchenOrderId: input.kitchenOrderId,
      });
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
    const updated = await orderRef.get();
    return { order: dataWithId<OrderDoc>(updated.id, updated.data() ?? {}), paymentStatus: nextStatus };
  }

  async recordRefund(scope: TenantScope, input: PaymentInput) {
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
      if (hasOperationKey(order, input.operationKey)) {
        nextStatus = order.paymentStatus ?? "pending";
        return;
      }
      assertCanRefund(order);
      const previousPaid = paidAmount(order);
      const refundAmount = Math.min(previousPaid, money(input.amount));
      if (refundAmount <= 0) throw new Error("A valid refund amount is required.");
      const paidTotal = Math.max(0, previousPaid - refundAmount);
      nextStatus = paidTotal <= 0 ? "refunded" : "partial";
      const gatewayDetails = {
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        providerOrderId: input.providerOrderId,
        providerRefundId: input.providerRefundId,
        gatewayStatus: input.gatewayStatus,
        reason: input.reason,
      };
      const entry = paymentEvent("refund", scope, input, now, { amount: refundAmount, balanceDue: Math.max(0, money(Number(order.total ?? 0) - paidTotal)), ...gatewayDetails });
      const audit = auditEvent("refund", scope, input, now, { amount: refundAmount, method: input.method, ...gatewayDetails });
      const patch = {
        paymentStatus: nextStatus,
        paidAmount: paidTotal,
        paymentTimeline: FieldValue.arrayUnion(entry),
        auditTimeline: FieldValue.arrayUnion(audit),
        statusHistory: FieldValue.arrayUnion({ event: "refund", paymentStatus: nextStatus, at: now, by: input.cashierId ?? scope.uid }),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      };
      transaction.set(orderRef, patch, { merge: true });
      transaction.set(customerOrderRef, patch, { merge: true });
      if (input.kitchenOrderId) transaction.set(this.db.collection("kitchenOrders").doc(input.kitchenOrderId), { paymentStatus: nextStatus, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(paymentRef, cleanRecord({
        id: paymentRef.id,
        tenantId: scope.tenantId,
        restaurantId: scope.tenantId,
        branchId: order.branchId ?? scope.branchIds?.[0] ?? "main",
        receiptId: input.orderId,
        invoiceNumber: order.invoiceNumber ?? input.orderId,
        orderId: input.orderId,
        method: input.method,
        amount: refundAmount,
        reference: input.reference ?? "",
        cashierId: input.cashierId ?? scope.uid ?? "",
        status: "refunded",
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        providerOrderId: input.providerOrderId,
        providerRefundId: input.providerRefundId,
        gatewayStatus: input.gatewayStatus,
        reason: input.reason,
        createdAt: FieldValue.serverTimestamp(),
      }));
      writeAudit(transaction, scope, { userId: input.cashierId ?? scope.uid, role: input.role, action: "refund", entityId: input.orderId, after: audit, device: input.device });
      writeNotification(transaction, scope, { type: "payment", title: "Refund recorded", message: `Refund of ₹${refundAmount} recorded.`, priority: "high", orderId: input.orderId, kitchenOrderId: input.kitchenOrderId });
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
    const updated = await orderRef.get();
    return { order: dataWithId<OrderDoc>(updated.id, updated.data() ?? {}), paymentStatus: nextStatus };
  }

  async startPaymentLock(scope: TenantScope, input: PaymentLockInput) {
    const orderRef = this.db.collection("orders").doc(input.orderId);
    const customerOrderRef = this.db.collection("customerOrders").doc(input.orderId);
    const now = new Date();
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      assertOrderTenant(order, scope);
      if (hasOperationKey(order, input.operationKey)) return;
      assertCanStartPayment(order);
      const lock = cleanRecord({
        locked: true,
        startedAt: now,
        by: input.userId ?? scope.uid ?? "",
        role: input.role,
        device: input.device,
        ip: input.ip,
        method: input.method,
        amount: input.amount,
      });
      const entry = paymentEvent("payment_started", scope, input, now, { balanceDue: Math.max(0, money(Number(order.total ?? 0) - paidAmount(order))), lock });
      const audit = auditEvent("payment_started", scope, input, now, { orderId: input.orderId, lock });
      const patch = {
        paymentLock: lock,
        paymentTimeline: FieldValue.arrayUnion(entry),
        auditTimeline: FieldValue.arrayUnion(audit),
        statusHistory: FieldValue.arrayUnion(cleanRecord({ event: "payment_started", paymentStatus: order.paymentStatus ?? "pending", at: now, by: input.userId ?? scope.uid })),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      };
      transaction.set(orderRef, patch, { merge: true });
      transaction.set(customerOrderRef, patch, { merge: true });
      writeAudit(transaction, scope, { userId: input.userId ?? scope.uid, role: input.role, action: "payment_started", entityId: input.orderId, after: audit, device: input.device });
    });
    const updated = await orderRef.get();
    return { order: dataWithId<OrderDoc>(updated.id, updated.data() ?? {}) };
  }

  async unlockPayment(scope: TenantScope, input: PaymentLockInput) {
    const orderRef = this.db.collection("orders").doc(input.orderId);
    const customerOrderRef = this.db.collection("customerOrders").doc(input.orderId);
    const reason = input.reason?.trim();
    if (!reason) throw new Error("Unlock reason is required.");
    const now = new Date();
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      assertOrderTenant(order, scope);
      if (hasOperationKey(order, input.operationKey)) return;
      const lock = cleanRecord({
        locked: false,
        unlockedAt: now,
        unlockedBy: input.userId ?? scope.uid ?? "",
        role: input.role,
        reason,
        device: input.device,
        ip: input.ip,
      });
      const entry = paymentEvent("payment_unlock", scope, input, now, { reason, lock });
      const audit = auditEvent("payment_unlock", scope, input, now, { reason, orderId: input.orderId, lock });
      const patch = {
        paymentLock: lock,
        paymentTimeline: FieldValue.arrayUnion(entry),
        auditTimeline: FieldValue.arrayUnion(audit),
        statusHistory: FieldValue.arrayUnion(cleanRecord({ event: "payment_unlock", paymentStatus: order.paymentStatus ?? "pending", at: now, by: input.userId ?? scope.uid, reason })),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      };
      transaction.set(orderRef, patch, { merge: true });
      transaction.set(customerOrderRef, patch, { merge: true });
      writeAudit(transaction, scope, { userId: input.userId ?? scope.uid, role: input.role, action: "payment_unlock", entityId: input.orderId, after: audit, device: input.device });
    });
    const updated = await orderRef.get();
    return { order: dataWithId<OrderDoc>(updated.id, updated.data() ?? {}) };
  }

  async recordBillCorrection(scope: TenantScope, input: BillCorrectionInput) {
    const orderRef = this.db.collection("orders").doc(input.orderId);
    const customerOrderRef = this.db.collection("customerOrders").doc(input.orderId);
    const reason = input.reason?.trim();
    if (!reason) throw new Error("Correction reason is required.");
    const now = new Date();
    let nextOrder: OrderDoc | null = null;
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      assertOrderTenant(order, scope);
      if (hasOperationKey(order, input.operationKey)) {
        nextOrder = order;
        return;
      }
      assertCanCorrectBill(order);
      const before = correctionSnapshot(order);
      const after = correctionSnapshot({
        ...order,
        lines: normalizeCorrectionLines(input.lines),
        discount: money(input.discount ?? order.discount),
        tax: money(input.tax ?? order.tax),
        deliveryFee: money(input.deliveryFee ?? order.deliveryFee),
        total: money(input.total ?? order.total),
      } as OrderDoc);
      const existing = correctionHistory(order);
      const version = existing.length + 1;
      const diff = correctionDiff(before, after);
      const record = cleanRecord({
        version,
        label: `Correction #${version}`,
        at: now,
        reason,
        orderNumber: order.invoiceNumber ?? order.id,
        user: input.userId ?? scope.uid ?? "",
        role: input.role ?? "",
        terminal: input.device ?? "",
        ip: input.ip,
        before,
        after,
        diff,
      });
      const audit = auditEvent("bill_correction", scope, input, now, record);
      const patch = {
        lines: after.lines,
        subtotal: after.subtotal,
        discount: after.discount,
        tax: after.tax,
        deliveryFee: after.deliveryFee,
        total: after.total,
        corrections: FieldValue.arrayUnion(record),
        correctionVersion: version,
        lastCorrectionAt: now,
        lastCorrectionReason: reason,
        auditTimeline: FieldValue.arrayUnion(audit),
        statusHistory: FieldValue.arrayUnion(cleanRecord({ event: "bill_correction", at: now, by: input.userId ?? scope.uid, reason, correctionVersion: version })),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      };
      transaction.set(orderRef, patch, { merge: true });
      transaction.set(customerOrderRef, patch, { merge: true });
      writeAudit(transaction, scope, { userId: input.userId ?? scope.uid, role: input.role, action: "bill_correction", entityId: input.orderId, after: record, device: input.device });
      writeNotification(transaction, scope, { type: "order_update", title: "Bill corrected", message: `Correction #${version} saved for ${order.invoiceNumber ?? order.id}.`, priority: "normal", orderId: input.orderId, kitchenOrderId: order.kitchenOrderId });
      nextOrder = { ...order, ...(patch as unknown as Partial<OrderDoc>), corrections: [...existing, record] } as OrderDoc;
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
    return nextOrder!;
  }

  async recordGatewayPaymentEvent(scope: TenantScope, input: PaymentInput & { status: "authorized" | "failed" }) {
    const orderRef = this.db.collection("orders").doc(input.orderId);
    const customerOrderRef = this.db.collection("customerOrders").doc(input.orderId);
    const paymentRef = this.db.collection("paymentTransactions").doc();
    const now = new Date();
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("This order is outside the active restaurant.");
      if (hasOperationKey(order, input.operationKey)) return;
      const type = input.status === "authorized" ? "payment_authorized" : "payment_failed";
      const amount = money(input.amount);
      const details = {
        amount,
        method: input.method,
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        providerOrderId: input.providerOrderId,
        gatewayStatus: input.gatewayStatus,
        failureReason: input.failureReason,
      };
      const timeline = paymentEvent(type, scope, input, now, details);
      const audit = auditEvent(type, scope, input, now, details);
      const patch = {
        paymentTimeline: FieldValue.arrayUnion(timeline),
        auditTimeline: FieldValue.arrayUnion(audit),
        statusHistory: FieldValue.arrayUnion({ event: type, paymentStatus: order.paymentStatus ?? "pending", at: now, by: input.cashierId ?? scope.uid }),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      };
      transaction.set(orderRef, patch, { merge: true });
      transaction.set(customerOrderRef, patch, { merge: true });
      transaction.set(paymentRef, cleanRecord({
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
        status: input.status,
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        providerOrderId: input.providerOrderId,
        gatewayStatus: input.gatewayStatus,
        failureReason: input.failureReason,
        createdAt: FieldValue.serverTimestamp(),
      }));
      writeAudit(transaction, scope, { userId: input.cashierId ?? scope.uid, role: input.role, action: type, entityId: input.orderId, after: audit, device: input.device });
      writeNotification(transaction, scope, {
        type: "payment",
        title: input.status === "authorized" ? "Payment authorized" : "Payment failed",
        message: input.status === "authorized" ? `Razorpay payment of ₹${amount} authorized.` : `Razorpay payment of ₹${amount} failed.`,
        priority: input.status === "authorized" ? "normal" : "high",
        orderId: input.orderId,
        kitchenOrderId: input.kitchenOrderId,
      });
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
    const updated = await orderRef.get();
    return { order: dataWithId<OrderDoc>(updated.id, updated.data() ?? {}) };
  }

  async recordPrint(scope: TenantScope, input: PrintInput) {
    const { orderId, type } = input;
    const ref = this.db.collection("orders").doc(orderId);
    const now = new Date();
    let nextOrder: OrderDoc | null = null;
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      assertOrderTenant(order, scope);
      if (hasOperationKey(order, input.operationKey)) {
        nextOrder = order;
        return;
      }
      const printNumber = Number(order.printedCount ?? 0) + 1;
      const event = type === "receipt" ? "receipt_printed" : type === "bill" ? "bill_printed" : "kot_printed";
      const printLifecycle = [
        printLifecycleEvent("queued", scope, input, now, printNumber),
        printLifecycleEvent("printing", scope, input, now, printNumber),
        printLifecycleEvent("success", scope, input, now, printNumber),
      ];
      const printerResponse = cleanRecord({ status: "success", printer: "browser-print", at: now, printNumber });
      const printDetails = cleanRecord({ printType: type, printNumber, reason: input.note, printer: "browser-print", printStatus: "success", printerResponse });
      const paymentTimeline = type === "bill" || type === "receipt" ? [paymentEvent(event, scope, input, now, printDetails)] : [];
      const audit = auditEvent(event, scope, input, now, printDetails);
      const patch = {
        printedCount: FieldValue.increment(1),
        lastPrintedAt: FieldValue.serverTimestamp(),
        lastPrintStatus: "success",
        lastPrinterResponse: printerResponse,
        printLifecycle: FieldValue.arrayUnion(...printLifecycle),
        ...(paymentTimeline.length ? { paymentTimeline: FieldValue.arrayUnion(...paymentTimeline) } : {}),
        auditTimeline: FieldValue.arrayUnion(audit),
        statusHistory: FieldValue.arrayUnion({ status: order.status, at: now, by: input.userId ?? scope.uid, event, printStatus: "success" }),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      };
      const printLogRef = this.db.collection("printLogs").doc();
      transaction.set(ref, patch, { merge: true });
      transaction.set(this.db.collection("customerOrders").doc(orderId), patch, { merge: true });
      transaction.set(printLogRef, cleanRecord({
        id: printLogRef.id,
        tenantId: scope.tenantId,
        restaurantId: scope.tenantId,
        orderId,
        referenceId: orderId,
        type,
        status: "success",
        printedBy: input.userId ?? scope.uid ?? "",
        userId: input.userId ?? scope.uid ?? "",
        user: input.userId ?? scope.uid ?? "",
        device: input.device,
        printer: "browser-print",
        printerProfileId: "browser-print",
        printerResponse,
        reason: input.note,
        printNumber,
        lifecycle: printLifecycle,
        timestamp: now.toISOString(),
        createdAt: FieldValue.serverTimestamp(),
      }));
      writeAudit(transaction, scope, { userId: input.userId ?? scope.uid, role: input.role, action: event, module: "orders", entityId: orderId, after: audit, device: input.device });
      nextOrder = { ...order, printedCount: printNumber } as OrderDoc;
    });
    return nextOrder!;
  }

  async recordOperationalEvent(scope: TenantScope, input: OperationalEventInput) {
    const ref = this.db.collection("orders").doc(input.orderId);
    const customerOrderRef = this.db.collection("customerOrders").doc(input.orderId);
    const now = new Date();
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("This order is outside the active restaurant.");
      if (hasOperationKey(order, input.operationKey)) return;
      const entry = auditEvent(input.event, scope, input, now, { amount: input.amount, method: input.method, note: input.note });
      const patch = {
        auditTimeline: FieldValue.arrayUnion(entry),
        statusHistory: FieldValue.arrayUnion({ event: input.event, at: now, by: input.userId ?? scope.uid }),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      };
      transaction.set(ref, patch, { merge: true });
      transaction.set(customerOrderRef, patch, { merge: true });
      writeAudit(transaction, scope, { userId: input.userId ?? scope.uid, role: input.role, action: input.event, entityId: input.orderId, after: entry, device: input.device });
      const notification = notificationForEvent(input.event, input.orderId, input.kitchenOrderId);
      if (notification) writeNotification(transaction, scope, notification);
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
    return { ok: true };
  }

  async recordSplitBill(scope: TenantScope, input: SplitBillInput) {
    const orderRef = this.db.collection("orders").doc(input.orderId);
    const customerOrderRef = this.db.collection("customerOrders").doc(input.orderId);
    const kitchenRef = input.kitchenOrderId ? this.db.collection("kitchenOrders").doc(input.kitchenOrderId) : null;
    const now = new Date();
    let nextStatus: PaymentStatus = "pending";
    await this.db.runTransaction(async (transaction) => {
      const [snapshot, kitchenSnapshot] = await Promise.all([
        transaction.get(orderRef),
        kitchenRef ? transaction.get(kitchenRef) : Promise.resolve(null),
      ]);
      if (!snapshot.exists) throw new Error("Order not found.");
      if (kitchenRef && !kitchenSnapshot?.exists) throw new Error("Kitchen ticket not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      assertOrderTenant(order, scope);
      if (hasOperationKey(order, input.operationKey)) {
        nextStatus = order.paymentStatus ?? "pending";
        return;
      }
      const kitchen = kitchenSnapshot?.data() ?? {};
      if (kitchenRef && ![kitchen.tenantId, kitchen.restaurantId].includes(scope.tenantId)) throw new Error("Kitchen ticket not found.");
      assertCanRecordPayment(order);
      if ((order.paymentLock as { locked?: boolean } | undefined)?.locked) throw new Error("Order currently being modified.");
      const previousPaid = paidAmount(order);
      const total = money(Number(order.total ?? 0));
      if (order.paymentStatus === "paid" || previousPaid + 0.01 >= total) throw new Error("Payment has already been collected.");
      const rows = input.splits
        .map((split, index) => ({
          id: split.id || `${input.orderId}-split-${Date.now()}-${index + 1}`,
          customerName: split.customerName?.trim() || `Guest ${index + 1}`,
          amount: money(split.amount),
          method: split.method,
          basis: split.basis || "custom",
          itemId: split.itemId,
          quantity: split.quantity && split.quantity > 0 ? Math.floor(split.quantity) : undefined,
          percent: split.percent && split.percent > 0 ? money(split.percent) : undefined,
          receipt: split.receipt !== false,
          note: split.note?.trim(),
          at: now,
          user: input.userId ?? scope.uid ?? "",
          role: input.role ?? "",
          device: input.device ?? "",
        }))
        .filter((split) => split.amount > 0);
      if (!rows.length) throw new Error("Valid split bill rows are required.");
      const splitTotal = money(rows.reduce((sum, split) => sum + split.amount, 0));
      const balance = money(total - previousPaid);
      if (splitTotal > balance + 0.01) throw new Error("Split bill amount exceeds the balance due.");
      const paidTotal = money(previousPaid + splitTotal);
      nextStatus = paidTotal <= 0 ? "pending" : paidTotal + 0.01 < total ? "partial" : "paid";
      const paymentTimeline = [
        ...(previousPaid <= 0 ? [paymentEvent("payment_started", scope, input, now, { balanceDue: total })] : []),
        paymentEvent(nextStatus === "paid" ? "payment_completed" : "partial_payment", scope, input, now, { amount: splitTotal, method: "split", balanceDue: money(total - paidTotal), splits: rows.length }),
      ];
      const audit = auditEvent("split_bill", scope, input, now, { splitTotal, splitCount: rows.length, paymentStatus: nextStatus });
      const patch = {
        splitPayment: rows.length > 1 || nextStatus === "partial" || Boolean((order as OrderDoc & { splitPayment?: boolean }).splitPayment),
        splitBills: FieldValue.arrayUnion(...rows),
        paymentStatus: nextStatus,
        paidAmount: paidTotal,
        paymentTimeline: FieldValue.arrayUnion(...paymentTimeline),
        auditTimeline: FieldValue.arrayUnion(audit),
        statusHistory: FieldValue.arrayUnion({ event: "split_bill", paymentStatus: nextStatus, at: now, by: input.userId ?? scope.uid }),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      };
      transaction.set(orderRef, patch, { merge: true });
      transaction.set(customerOrderRef, patch, { merge: true });
      if (kitchenRef) transaction.set(kitchenRef, { paymentStatus: nextStatus, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      rows.forEach((split) => {
        const paymentRef = this.db.collection("paymentTransactions").doc();
        transaction.set(paymentRef, cleanRecord({
          id: paymentRef.id,
          tenantId: scope.tenantId,
          restaurantId: scope.tenantId,
          branchId: order.branchId ?? scope.branchIds?.[0] ?? "main",
          receiptId: input.orderId,
          invoiceNumber: order.invoiceNumber ?? input.orderId,
          orderId: input.orderId,
          splitBillId: split.id,
          method: split.method,
          amount: split.amount,
          reference: split.note ?? "",
          cashierId: input.userId ?? scope.uid ?? "",
          status: "paid",
          createdAt: FieldValue.serverTimestamp(),
        }));
        if (split.receipt) {
          const printRef = this.db.collection("printLogs").doc();
          transaction.set(printRef, cleanRecord({
            id: printRef.id,
            tenantId: scope.tenantId,
            restaurantId: scope.tenantId,
            orderId: input.orderId,
            splitBillId: split.id,
            type: "receipt",
            status: "queued",
            printedBy: input.userId ?? scope.uid ?? "",
            device: input.device,
            createdAt: FieldValue.serverTimestamp(),
          }));
        }
      });
      writeAudit(transaction, scope, { userId: input.userId ?? scope.uid, role: input.role, action: "split_bill", entityId: input.orderId, after: audit, device: input.device });
      writeNotification(transaction, scope, {
        type: "payment",
        title: nextStatus === "paid" ? "Split bill paid" : "Split payment recorded",
        message: `${rows.length} split payment${rows.length === 1 ? "" : "s"} totalling ₹${splitTotal} recorded.`,
        priority: nextStatus === "paid" ? "normal" : "high",
        orderId: input.orderId,
        kitchenOrderId: input.kitchenOrderId,
      });
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
    const updated = await orderRef.get();
    return { order: dataWithId<OrderDoc>(updated.id, updated.data() ?? {}), paymentStatus: nextStatus };
  }

  async transferTable(scope: TenantScope, input: TransferTableInput) {
    const orderRef = this.db.collection("orders").doc(input.orderId);
    const customerOrderRef = this.db.collection("customerOrders").doc(input.orderId);
    const kitchenRef = input.kitchenOrderId ? this.db.collection("kitchenOrders").doc(input.kitchenOrderId) : null;
    const now = new Date();
    let nextOrder: OrderDoc | null = null;
    await this.db.runTransaction(async (transaction) => {
      const [snapshot, kitchenSnapshot] = await Promise.all([
        transaction.get(orderRef),
        kitchenRef ? transaction.get(kitchenRef) : Promise.resolve(null),
      ]);
      if (!snapshot.exists) throw new Error("Order not found.");
      if (kitchenRef && !kitchenSnapshot?.exists) throw new Error("Kitchen ticket not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      assertOrderTenant(order, scope);
      if (hasOperationKey(order, input.operationKey)) {
        nextOrder = order;
        return;
      }
      assertCanModifyOperationalOrder(order);
      const kitchen = kitchenSnapshot?.data() ?? {};
      if (kitchenRef && ![kitchen.tenantId, kitchen.restaurantId].includes(scope.tenantId)) throw new Error("Kitchen ticket not found.");
      const assigningWaiter = input.mode === "waiter";
      const tableNumber = input.tableNumber?.trim() || order.tableNumber;
      const waiterName = input.waiterName?.trim();
      if (!assigningWaiter && !tableNumber) throw new Error("Target table is required.");
      if (assigningWaiter && !waiterName) throw new Error("An active waiter is required.");
      const event = assigningWaiter ? "assign_waiter" : "transfer_table";
      const entry = auditEvent(event, scope, input, now, { fromTable: order.tableNumber, toTable: tableNumber, waiterName });
      const patch = cleanRecord({
        tableNumber,
        waiterName: waiterName || order.waiterName,
        auditTimeline: FieldValue.arrayUnion(entry),
        statusHistory: FieldValue.arrayUnion({ event, fromTable: order.tableNumber, toTable: tableNumber, waiterName, at: now, by: input.userId ?? scope.uid }),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      });
      transaction.set(orderRef, patch, { merge: true });
      transaction.set(customerOrderRef, patch, { merge: true });
      if (kitchenRef) transaction.set(kitchenRef, cleanRecord({ tableNumber, waiterName, statusHistory: FieldValue.arrayUnion({ event, fromTable: order.tableNumber, toTable: tableNumber, waiterName, at: now, by: input.userId ?? scope.uid }), updatedAt: FieldValue.serverTimestamp() }), { merge: true });
      writeAudit(transaction, scope, { userId: input.userId ?? scope.uid, role: input.role, action: event, entityId: input.orderId, after: entry, device: input.device });
      writeNotification(transaction, scope, {
        type: "order_update",
        title: assigningWaiter ? "Waiter assigned" : "Table transferred",
        message: assigningWaiter ? `${waiterName} assigned to ${tableNumber || order.id}.` : `${order.tableNumber || "Order"} moved to ${tableNumber}.`,
        priority: "normal",
        orderId: input.orderId,
        kitchenOrderId: input.kitchenOrderId,
      });
      nextOrder = { ...order, tableNumber, waiterName: waiterName || order.waiterName };
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
    return nextOrder!;
  }

  async mergeTables(scope: TenantScope, input: MergeTablesInput) {
    const targetRef = this.db.collection("orders").doc(input.orderId);
    const sourceIds = Array.from(new Set(input.sourceOrderIds.filter((id) => id && id !== input.orderId))).slice(0, 12);
    if (!sourceIds.length) throw new Error("At least one source order is required.");
    const sourceRefs = sourceIds.map((id) => this.db.collection("orders").doc(id));
    const now = new Date();
    let nextOrder: OrderDoc | null = null;
    await this.db.runTransaction(async (transaction) => {
      const orderSnapshots = await Promise.all([targetRef, ...sourceRefs].map((ref) => transaction.get(ref)));
      const missing = orderSnapshots.find((snapshot) => !snapshot.exists);
      if (missing) throw new Error("Order not found.");
      const [target, ...sources] = orderSnapshots.map((snapshot) => dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {}));
      [target, ...sources].forEach((order) => assertOrderTenant(order, scope));
      if (hasOperationKey(target, input.operationKey)) {
        nextOrder = target;
        return;
      }
      [target, ...sources].forEach(assertCanModifyOperationalOrder);
      const targetKitchenId = input.kitchenOrderId || target.kitchenOrderId;
      const sourceKitchenIds = Array.from(new Set([
        ...sources.map((order) => order.kitchenOrderId).filter(isString),
        ...(input.sourceKitchenOrderIds ?? []).filter(isString),
      ])).filter((id) => id !== targetKitchenId);
      const kitchenRefs = [
        ...(targetKitchenId ? [this.db.collection("kitchenOrders").doc(targetKitchenId)] : []),
        ...sourceKitchenIds.map((id) => this.db.collection("kitchenOrders").doc(id)),
      ];
      const kitchenSnapshots = await Promise.all(kitchenRefs.map((ref) => transaction.get(ref)));
      const kitchenDocs = kitchenSnapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() ?? {}) } as Record<string, unknown>));
      kitchenDocs.forEach((doc) => {
        if (![doc.tenantId, doc.restaurantId].includes(scope.tenantId)) throw new Error("Kitchen ticket not found.");
      });
      const ordersToMerge = [target, ...sources];
      const lines = mergeOrderLines(ordersToMerge);
      const subtotal = money(ordersToMerge.reduce((sum, order) => sum + Number(order.subtotal ?? 0), 0));
      const discount = money(ordersToMerge.reduce((sum, order) => sum + Number(order.discount ?? 0), 0));
      const tax = money(ordersToMerge.reduce((sum, order) => sum + Number(order.tax ?? 0), 0));
      const deliveryFee = money(ordersToMerge.reduce((sum, order) => sum + Number(order.deliveryFee ?? 0), 0));
      const total = money(ordersToMerge.reduce((sum, order) => sum + Number(order.total ?? 0), 0));
      const paidTotal = money(ordersToMerge.reduce((sum, order) => sum + paidAmount(order), 0));
      const paymentStatus = paymentStatusFromPaid(total, paidTotal);
      const tableNumber = input.tableNumber?.trim() || target.tableNumber || sources.map((order) => order.tableNumber).filter(Boolean).join(" + ");
      const entry = auditEvent("merge_tables", scope, input, now, { sourceOrderIds: sourceIds, tableNumber, total, paymentStatus });
      const sourceAudit = sources.flatMap(auditTimelineOf);
      const sourcePayments = sources.flatMap(paymentTimelineOf);
      const sourceSplits = sources.flatMap(splitBillsOf);
      const targetPatch = cleanRecord({
        lines,
        subtotal,
        discount,
        tax,
        deliveryFee,
        total,
        paidAmount: paidTotal,
        paymentStatus,
        tableNumber,
        splitPayment: sourceSplits.length > 0 || ordersToMerge.some((order) => Boolean((order as OrderDoc & { splitPayment?: boolean }).splitPayment)),
        mergedOrderIds: FieldValue.arrayUnion(...sourceIds),
        auditTimeline: sourceAudit.length ? FieldValue.arrayUnion(...sourceAudit, entry) : FieldValue.arrayUnion(entry),
        ...(sourcePayments.length ? { paymentTimeline: FieldValue.arrayUnion(...sourcePayments) } : {}),
        ...(sourceSplits.length ? { splitBills: FieldValue.arrayUnion(...sourceSplits) } : {}),
        statusHistory: FieldValue.arrayUnion({ event: "merge_tables", sourceOrderIds: sourceIds, at: now, by: input.userId ?? scope.uid }),
        updatedAt: FieldValue.serverTimestamp(),
        ...operationPatch(input.operationKey),
      });
      transaction.set(targetRef, targetPatch, { merge: true });
      transaction.set(this.db.collection("customerOrders").doc(target.id), targetPatch, { merge: true });
      sources.forEach((source) => {
        const sourcePatch = {
          status: "cancelled" as const,
          mergedIntoOrderId: target.id,
          auditTimeline: FieldValue.arrayUnion(auditEvent("merge_tables", scope, input, now, { mergedIntoOrderId: target.id })),
          statusHistory: FieldValue.arrayUnion({ event: "merge_tables", mergedIntoOrderId: target.id, at: now, by: input.userId ?? scope.uid }),
          updatedAt: FieldValue.serverTimestamp(),
        };
        transaction.set(this.db.collection("orders").doc(source.id), sourcePatch, { merge: true });
        transaction.set(this.db.collection("customerOrders").doc(source.id), sourcePatch, { merge: true });
      });
      const targetKitchenSnapshot = targetKitchenId ? kitchenSnapshots[0] : null;
      const sourceKitchenSnapshots = targetKitchenId ? kitchenSnapshots.slice(1) : kitchenSnapshots;
      if (targetKitchenId && targetKitchenSnapshot?.exists) {
        const kitchenLines = mergeKitchenLines(kitchenDocs);
        transaction.set(this.db.collection("kitchenOrders").doc(targetKitchenId), cleanRecord({
          lines: kitchenLines.length ? kitchenLines : undefined,
          total,
          tableNumber,
          paymentStatus,
          mergedOrderIds: FieldValue.arrayUnion(...sourceIds),
          statusHistory: FieldValue.arrayUnion({ event: "merge_tables", sourceOrderIds: sourceIds, at: now, by: input.userId ?? scope.uid }),
          updatedAt: FieldValue.serverTimestamp(),
        }), { merge: true });
      }
      sourceKitchenSnapshots.forEach((snapshot) => {
        if (!snapshot.exists) return;
        transaction.set(snapshot.ref, {
          status: "cancelled",
          foodStatus: "cancelled",
          mergedIntoOrderId: target.id,
          statusHistory: FieldValue.arrayUnion({ event: "merge_tables", mergedIntoOrderId: target.id, at: now, by: input.userId ?? scope.uid }),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      writeAudit(transaction, scope, { userId: input.userId ?? scope.uid, role: input.role, action: "merge_tables", entityId: target.id, after: entry, device: input.device });
      writeNotification(transaction, scope, { type: "order_update", title: "Tables merged", message: `${sourceIds.length + 1} orders merged into ${tableNumber || target.id}.`, priority: "normal", orderId: target.id, kitchenOrderId: targetKitchenId });
      nextOrder = { ...target, lines, subtotal, discount, tax, deliveryFee, total, paymentStatus, tableNumber };
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
    return nextOrder!;
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

  async updateStatus(scope: TenantScope, orderId: string, status: OrderDoc["status"], actor: ActorInput = {}) {
    const ref = this.db.collection("orders").doc(orderId);
    const now = new Date();
    let nextOrder: OrderDoc | null = null;
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = dataWithId<OrderDoc>(snapshot.id, snapshot.data() ?? {});
      if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("This order is outside the active restaurant.");
      if (hasOperationKey(order, actor.operationKey)) {
        nextOrder = order;
        return;
      }
      assertLegalOrderTransition(order, status);
      const kitchenRef = order.kitchenOrderId ? this.db.collection("kitchenOrders").doc(order.kitchenOrderId) : null;
      const kitchenSnapshot = kitchenRef ? await transaction.get(kitchenRef) : null;
      const kitchen = kitchenSnapshot?.data() ?? {};
      const linkedKitchenValid = Boolean(kitchenRef && kitchenSnapshot?.exists && [kitchen.tenantId, kitchen.restaurantId].includes(scope.tenantId));
      const event = statusEventForTransition(status);
      const foodStatus = orderStatusToFoodStatus(status);
      const note = actor.note?.trim();
      const actorPatch = status === "preparing"
        ? { preparedBy: scope.uid ?? "" }
        : status === "served"
          ? { servedBy: scope.uid ?? "" }
          : ["delivered", "completed"].includes(status)
            ? { completedBy: scope.uid ?? "" }
            : {};
      const statusPatch = {
        status,
        foodStatus,
        auditTimeline: FieldValue.arrayUnion(auditEvent(event, scope, actor, now, cleanRecord({ status, note }))),
        statusHistory: FieldValue.arrayUnion(cleanRecord({ status, foodStatus, at: now, by: actor.userId ?? scope.uid, event, note })),
        updatedAt: FieldValue.serverTimestamp(),
        ...(note ? { statusNote: note } : {}),
        ...operationPatch(actor.operationKey),
        ...actorPatch,
      };
      transaction.set(ref, statusPatch, { merge: true });
      transaction.set(this.db.collection("customerOrders").doc(orderId), statusPatch, { merge: true });
      if (linkedKitchenValid && kitchenRef) {
        transaction.set(kitchenRef, cleanRecord({
          status: foodStatus,
          foodStatus,
          statusHistory: FieldValue.arrayUnion(cleanRecord({ status: foodStatus, foodStatus, at: now, by: actor.userId ?? scope.uid, event, note })),
          updatedAt: FieldValue.serverTimestamp(),
          ...(note ? { statusNote: note } : {}),
          ...actorPatch,
        }), { merge: true });
      }
      writeAudit(transaction, scope, { userId: actor.userId ?? scope.uid, role: actor.role, action: event, module: "orders", entityId: orderId, after: cleanRecord({ status, kitchenOrderId: order.kitchenOrderId, note }), device: actor.device });
      const notification = notificationForEvent(event, orderId, order.kitchenOrderId);
      if (notification) writeNotification(transaction, scope, notification);
      nextOrder = { ...order, status, ...(note ? { statusNote: note } : {}) };
    });
    await dispatchPendingTenantPushNotifications(scope).catch(logPushDispatchError);
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

function assertCanModifyOperationalOrder(order: OrderDoc) {
  if (["cancelled", "rejected", "delivered", "completed"].includes(order.status)) throw new Error("This order is no longer active.");
  if ((order.paymentLock as { locked?: boolean } | undefined)?.locked || ["authorized", "partial", "paid", "refunded"].includes(order.paymentStatus ?? "pending")) {
    throw new Error("Order cannot be modified after payment has started.");
  }
}

function assertPaymentLockOwner(order: OrderDoc, userId?: string) {
  const lock = order.paymentLock as { locked?: boolean; by?: string } | undefined;
  if (lock?.locked && lock.by && lock.by !== userId) throw new Error("Order currently being modified.");
}

function operationPatch(key?: string) {
  return key ? { operationKeys: FieldValue.arrayUnion(key) } : {};
}

function paymentStatusFromPaid(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return "pending";
  return paid + 0.01 < total ? "partial" : "paid";
}

function assertOrderTenant(order: OrderDoc, scope: TenantScope) {
  if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("This order is outside the active restaurant.");
}

function auditTimelineOf(order: OrderDoc | null) {
  if (!order) return [];
  const value = (order as OrderDoc & { auditTimeline?: unknown[] }).auditTimeline;
  return Array.isArray(value) ? value : [];
}

function paymentTimelineOf(order: OrderDoc | null) {
  if (!order) return [];
  const value = (order as OrderDoc & { paymentTimeline?: unknown[] }).paymentTimeline;
  return Array.isArray(value) ? value : [];
}

function splitBillsOf(order: OrderDoc | null) {
  if (!order) return [];
  const value = (order as OrderDoc & { splitBills?: unknown[] }).splitBills;
  return Array.isArray(value) ? value : [];
}

function correctionHistory(order: OrderDoc | null) {
  if (!order) return [];
  const value = (order as OrderDoc & { corrections?: unknown[] }).corrections;
  return Array.isArray(value) ? value : [];
}

function normalizeCorrectionLines(lines: CorrectionLineInput[]): OrderLineDoc[] {
  return lines
    .map((line, index) => ({
      menuItemId: String(line.menuItemId ?? line.itemId ?? `manual-${index + 1}`),
      name: String(line.name ?? "").trim(),
      price: money(Number(line.price ?? 0)),
      quantity: Math.max(0, Math.floor(Number(line.quantity ?? 0))),
      notes: line.notes?.trim(),
    }))
    .filter((line) => line.name && line.quantity > 0);
}

function correctionSnapshot(order: Pick<OrderDoc, "lines" | "discount" | "tax" | "deliveryFee" | "total">) {
  const lines = (order.lines ?? []).map((line) => ({
    menuItemId: line.menuItemId,
    name: line.name,
    price: money(Number(line.price ?? 0)),
    quantity: Number(line.quantity ?? 0),
    total: money(Number(line.price ?? 0) * Number(line.quantity ?? 0)),
  }));
  const subtotal = money(lines.reduce((sum, line) => sum + line.total, 0));
  return {
    lines,
    subtotal,
    discount: money(Number(order.discount ?? 0)),
    tax: money(Number(order.tax ?? 0)),
    deliveryFee: money(Number(order.deliveryFee ?? 0)),
    total: money(Number(order.total ?? subtotal)),
  };
}

function correctionDiff(before: ReturnType<typeof correctionSnapshot>, after: ReturnType<typeof correctionSnapshot>) {
  const prior = new Map(before.lines.map((line) => [line.menuItemId || line.name, line]));
  const next = new Map(after.lines.map((line) => [line.menuItemId || line.name, line]));
  const added = after.lines.filter((line) => !prior.has(line.menuItemId || line.name));
  const removed = before.lines.filter((line) => !next.has(line.menuItemId || line.name));
  const quantityChanges = after.lines
    .map((line) => {
      const old = prior.get(line.menuItemId || line.name);
      return old && old.quantity !== line.quantity ? { item: line.name, before: old.quantity, after: line.quantity } : null;
    })
    .filter(Boolean);
  const priceChanges = after.lines
    .map((line) => {
      const old = prior.get(line.menuItemId || line.name);
      return old && old.price !== line.price ? { item: line.name, before: old.price, after: line.price } : null;
    })
    .filter(Boolean);
  return {
    itemsAdded: added,
    itemsRemoved: removed,
    quantityChanges,
    priceChanges,
    taxChange: money(after.tax - before.tax),
    discountChange: money(after.discount - before.discount),
    packingChange: money(after.deliveryFee - before.deliveryFee),
    grandTotalDifference: money(after.total - before.total),
  };
}

function mergeOrderLines(orders: OrderDoc[]) {
  const lines = new Map<string, OrderLineDoc>();
  for (const order of orders) {
    for (const line of order.lines ?? []) {
      const key = line.menuItemId || line.name;
      const existing = lines.get(key);
      lines.set(key, existing
        ? { ...existing, quantity: Number(existing.quantity ?? 0) + Number(line.quantity ?? 0), price: money(Number(line.price ?? existing.price ?? 0)) }
        : { ...line, quantity: Number(line.quantity ?? 0), price: money(Number(line.price ?? 0)) });
    }
  }
  return Array.from(lines.values()).filter((line) => Number(line.quantity ?? 0) > 0);
}

function mergeKitchenLines(kitchenDocs: Record<string, unknown>[]) {
  const lines = new Map<string, Record<string, unknown>>();
  for (const doc of kitchenDocs) {
    const docLines = Array.isArray(doc.lines) ? doc.lines as Record<string, unknown>[] : [];
    for (const line of docLines) {
      const key = String(line.itemId ?? line.menuItemId ?? line.name ?? "");
      if (!key) continue;
      const existing = lines.get(key);
      lines.set(key, existing
        ? { ...existing, quantity: Number(existing.quantity ?? 0) + Number(line.quantity ?? 0), price: money(Number(line.price ?? existing.price ?? 0)) }
        : { ...line, quantity: Number(line.quantity ?? 0), price: money(Number(line.price ?? 0)) });
    }
  }
  return Array.from(lines.values()).filter((line) => Number(line.quantity ?? 0) > 0);
}

function paymentEvent(type: string, scope: TenantScope, input: ActorInput & { amount?: number; method?: string }, at: Date, extra: Record<string, unknown> = {}) {
  return cleanRecord({
    type,
    at,
    user: input.userId ?? scope.uid ?? "",
    role: input.role ?? "",
    amount: input.amount,
    method: input.method,
    device: input.device ?? "",
    ip: input.ip,
    ...extra,
  });
}

function printLifecycleEvent(status: "queued" | "printing" | "success" | "failed" | "retry" | "cancelled", scope: TenantScope, input: PrintInput, at: Date, printNumber: number, extra: Record<string, unknown> = {}) {
  return cleanRecord({
    status,
    at,
    orderId: input.orderId,
    printType: input.type,
    printNumber,
    user: input.userId ?? scope.uid ?? "",
    role: input.role ?? "",
    device: input.device ?? "",
    printer: "browser-print",
    ...extra,
  });
}

function auditEvent(type: string, scope: TenantScope, input: ActorInput, at: Date, extra: Record<string, unknown> = {}) {
  return cleanRecord({
    type,
    timestamp: at,
    user: input.userId ?? scope.uid ?? "",
    role: input.role ?? "",
    device: input.device ?? "",
    ip: input.ip,
    restaurant: scope.tenantId,
    ...extra,
  });
}

function writeAudit(transaction: Transaction, scope: TenantScope, input: {
  userId?: string;
  role?: string;
  action: string;
  module?: string;
  entityId?: string;
  after?: unknown;
  device?: string;
}) {
  const ref = adminDb().collection("auditLogs").doc();
  transaction.set(ref, cleanRecord({
    id: ref.id,
    tenantId: scope.tenantId,
    restaurantId: scope.tenantId,
    userId: input.userId ?? scope.uid ?? "",
    role: input.role,
    action: input.action,
    module: input.module ?? "orders",
    entityId: input.entityId,
    after: input.after,
    device: input.device,
    createdAt: FieldValue.serverTimestamp(),
  }));
}

function writeNotification(transaction: Transaction, scope: TenantScope, input: {
  type: string;
  title: string;
  message: string;
  priority: "normal" | "high";
  orderId?: string;
  kitchenOrderId?: string;
}) {
  const ref = adminDb().collection("notifications").doc();
  transaction.set(ref, cleanRecord({
    id: ref.id,
    tenantId: scope.tenantId,
    restaurantId: scope.tenantId,
    type: input.type,
    title: input.title,
    message: input.message,
    priority: input.priority,
    orderId: input.orderId,
    kitchenOrderId: input.kitchenOrderId,
    link: notificationLink(input),
    sound: notificationSound(input.type),
    pushStatus: "pending",
    pushAttempts: 0,
    audience: ["owner", "manager", "cashier", "waiter", "kitchen"],
    readBy: [],
    createdAt: FieldValue.serverTimestamp(),
  }));
}

function notificationLink(input: { type: string; orderId?: string; kitchenOrderId?: string }) {
  if (input.type === "ready" || input.kitchenOrderId) return "/owner/kitchen";
  if (input.type === "payment") return "/owner/pos";
  return input.orderId ? `/owner/orders?orderId=${encodeURIComponent(input.orderId)}` : "/owner/orders";
}

function notificationSound(type: string) {
  if (type === "ready") return "kitchen-alert";
  if (type === "payment") return "pos-alert";
  if (type === "new_order") return "loud-alarm";
  return "bell";
}

function logPushDispatchError(error: unknown) {
  productionLogger.warn("push-notifications.dispatch_failed", { errorName: safeErrorName(error) });
}

function notificationForEvent(event: string, orderId?: string, kitchenOrderId?: string) {
  if (event === "reminder") return { type: "reminder", title: "Kitchen reminder", message: "Kitchen reminder sent.", priority: "high" as const, orderId, kitchenOrderId };
  if (event === "kitchen_accepted") return { type: "new_order", title: "Order accepted", message: "Accepted order sent to kitchen and waiter.", priority: "high" as const, orderId, kitchenOrderId };
  if (event === "kitchen_ready") return { type: "ready", title: "Order ready", message: "Kitchen marked an order ready.", priority: "high" as const, orderId, kitchenOrderId };
  if (event === "completion") return { type: "completion", title: "Order completed", message: "Order completed.", priority: "normal" as const, orderId, kitchenOrderId };
  return null;
}

function draftAuditEvents(previous: OrderDoc | null, bill: PosBill, scope: TenantScope, at: Date) {
  const events: Record<string, unknown>[] = [];
  const before = new Map((previous?.lines ?? []).map((line) => [line.menuItemId, line]));
  const after = new Map(bill.lines.map((line) => [line.itemId, line]));
  for (const line of bill.lines) {
    const prior = before.get(line.itemId);
    if (!prior || Number(line.quantity) > Number(prior.quantity)) {
      events.push(auditEvent("item_added", scope, { userId: scope.uid }, at, { itemId: line.itemId, name: line.name, quantity: Number(line.quantity) - Number(prior?.quantity ?? 0) }));
    }
  }
  for (const line of previous?.lines ?? []) {
    const next = after.get(line.menuItemId);
    if (!next || Number(next.quantity) < Number(line.quantity)) {
      events.push(auditEvent("item_removed", scope, { userId: scope.uid }, at, { itemId: line.menuItemId, name: line.name, quantity: Number(line.quantity) - Number(next?.quantity ?? 0) }));
    }
  }
  if (previous && money(previous.discount) !== money(bill.discount)) {
    events.push(auditEvent("discount", scope, { userId: scope.uid }, at, { before: money(previous.discount), after: money(bill.discount) }));
  }
  const coupon = (bill as PosBill & { couponCode?: string }).couponCode;
  if (coupon) events.push(auditEvent("coupon", scope, { userId: scope.uid }, at, { coupon }));
  return events;
}

function cleanRecord(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function matchesDateRange(order: OrderDoc, from?: Date, to?: Date) {
  if (!from && !to) return true;
  const fromMs = from?.getTime() ?? Number.NEGATIVE_INFINITY;
  const toMs = to?.getTime() ?? Number.POSITIVE_INFINITY;
  const created = dateMs(order.createdAt);
  const scheduled = dateMs(order.scheduledFor);
  return (created >= fromMs && created <= toMs) || (scheduled >= fromMs && scheduled <= toMs);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
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
