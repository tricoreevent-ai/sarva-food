import "server-only";

import { FieldValue, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { assertLegalKitchenTransition, assertLegalOrderTransition } from "@/lib/order-state-machine";
import { hasOperationKey } from "@/lib/server/operation-idempotency";
import type { KitchenOrderDoc, KitchenOrderStatus, OrderDoc, OrderStatus, PaymentStatus } from "@/types/firebase";
import { dataWithId, dateMs, readTenantDocs, type TenantScope } from "@/repositories/shared";

type KitchenOrderPatch = Partial<KitchenOrderDoc> & { printedCountIncrement?: number; operationKey?: string };
type KitchenUpdateResult = KitchenOrderDoc & { unchanged?: boolean };

export class KitchenRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope, options: { from?: Date; to?: Date; limit?: number } = {}) {
    return (await readTenantDocs(this.db, "kitchenOrders", scope, ["tenantId", "restaurantId"], options.limit ?? 200))
      .map((doc) => dataWithId<KitchenOrderDoc>(doc.id, doc.data()))
      .filter((order) => matchesDateRange(order, options.from, options.to))
      .sort((first, second) => dateMs(second.createdAt) - dateMs(first.createdAt));
  }

  async create(scope: TenantScope, input: Partial<KitchenOrderDoc> & { operationKey?: string }) {
    const ref = input.id ? this.db.collection("kitchenOrders").doc(input.id) : this.db.collection("kitchenOrders").doc();
    const { operationKey, ...docInput } = input;
    const lines = Array.isArray(input.lines) ? input.lines : [];
    const subtotal = Number(input.subtotal ?? lines.reduce((sum, line) => sum + Number(line.price ?? 0) * Number(line.quantity ?? 0), 0));
    let existing: KitchenOrderDoc | null = null;
    const order = {
      ...docInput,
      id: ref.id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      branchId: input.branchId || scope.branchIds?.[0] || "main",
      orderType: input.orderType || "dine-in",
      source: input.source || "POS",
      status: input.status || "new",
      foodStatus: input.foodStatus || input.status || "new",
      priority: input.priority || "normal",
      lines,
      subtotal,
      tax: Number(input.tax ?? 0),
      total: Number(input.total ?? subtotal),
      paymentStatus: input.paymentStatus || "pending",
      statusHistory: input.statusHistory?.length ? input.statusHistory : [{ status: input.status || "new", at: new Date() }],
      operationKeys: operationKey ? [operationKey] : input.operationKeys ?? [],
      preparedBy: input.preparedBy ?? "",
      servedBy: input.servedBy ?? "",
      completedBy: input.completedBy ?? "",
      printedCount: Number(input.printedCount ?? 0),
      lastPrintedAt: input.lastPrintedAt ?? null,
      etaMinutes: Number(input.etaMinutes ?? 12),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) {
        const current = dataWithId<KitchenOrderDoc>(snapshot.id, snapshot.data() ?? {});
        if (![current.tenantId, current.restaurantId].includes(scope.tenantId)) throw new Error("Kitchen order is outside the active restaurant.");
        existing = current;
        return;
      }
      transaction.set(ref, order, { merge: true });
    });
    return existing ?? dataWithId<KitchenOrderDoc>(ref.id, (await ref.get()).data() ?? order);
  }

  async update(scope: TenantScope, id: string, patch: KitchenOrderPatch) {
    const ref = this.db.collection("kitchenOrders").doc(id);
    let current = await this.assertTenant(scope, id);
    const sameStatus = Boolean(patch.status && current.status === patch.status);
    const hasMaterialPatch = Object.entries(patch).some(([key, value]) => (
      typeof value !== "undefined" && !["id", "tenantId", "restaurantId", "status", "operationKey"].includes(key)
    ));
    if (sameStatus && !hasMaterialPatch) return { ...dataWithId<KitchenOrderDoc>(id, current), unchanged: true } satisfies KitchenUpdateResult;
    let unchanged = false;
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("Kitchen order not found.");
      current = snapshot.data() as Partial<KitchenOrderDoc>;
      if (![current.tenantId, current.restaurantId].includes(scope.tenantId)) throw new Error("Kitchen order is outside the active restaurant.");
      if (patch.operationKey && hasOperationKey(current, patch.operationKey)) {
        unchanged = true;
        return;
      }
      const statusChanged = Boolean(patch.status && current.status && patch.status !== current.status);
      if (patch.status && current.status && patch.status !== current.status) assertLegalKitchenTransition(current.status, patch.status);
      const linkedOrders = statusChanged
        ? await transaction.get(this.db.collection("orders").where("kitchenOrderId", "==", id).limit(1))
        : null;
      const { printedCountIncrement, operationKey, ...safePatch } = patch;
      const printIncrement = Number(printedCountIncrement ?? 0);
      const lines = Array.isArray(patch.lines) ? patch.lines : undefined;
      const subtotal = lines ? lines.reduce((sum, line) => sum + Number(line.price ?? 0) * Number(line.quantity ?? 0), 0) : undefined;
      const statusPatch = patch.status && patch.status !== current.status
        ? {
            [`${patch.status}At`]: FieldValue.serverTimestamp(),
            foodStatus: patch.status,
            statusHistory: FieldValue.arrayUnion({ status: patch.status, at: new Date().toISOString() }),
          }
        : {};
      const next = Object.fromEntries(Object.entries({
        ...safePatch,
        ...statusPatch,
        tenantId: undefined,
        restaurantId: undefined,
        id: undefined,
        operationKeys: operationKey ? FieldValue.arrayUnion(operationKey) : undefined,
        printedCount: printIncrement > 0 ? FieldValue.increment(printIncrement) : safePatch.printedCount,
        lastPrintedAt: printIncrement > 0 ? FieldValue.serverTimestamp() : safePatch.lastPrintedAt,
        subtotal,
        total: safePatch.total ?? subtotal,
        updatedAt: FieldValue.serverTimestamp(),
      }).filter(([, value]) => typeof value !== "undefined"));
      transaction.set(ref, next, { merge: true });
      const linkedOrder = linkedOrders?.docs.find((doc) => {
        const order = doc.data() as Partial<OrderDoc>;
        return [order.tenantId, order.restaurantId].includes(scope.tenantId);
      });
      if (patch.status && linkedOrder) this.syncLinkedOrderStatus(transaction, scope, linkedOrder, patch.status, operationKey);
    });
    if (unchanged) return { ...dataWithId<KitchenOrderDoc>(id, current), unchanged: true } satisfies KitchenUpdateResult;
    const snapshot = await ref.get();
    return dataWithId<KitchenOrderDoc>(id, snapshot.data() ?? {});
  }

  async updateStatus(scope: TenantScope, id: string, status: KitchenOrderStatus) {
    return this.update(scope, id, { status });
  }

  private async assertTenant(scope: TenantScope, id: string) {
    const snapshot = await this.db.collection("kitchenOrders").doc(id).get();
    if (!snapshot.exists) throw new Error("Kitchen order not found.");
    const order = snapshot.data() as Partial<KitchenOrderDoc>;
    if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("Kitchen order is outside the active restaurant.");
    return order;
  }

  private syncLinkedOrderStatus(transaction: Transaction, scope: TenantScope, doc: QueryDocumentSnapshot, kitchenStatus: KitchenOrderStatus, operationKey?: string) {
    const order = dataWithId<OrderDoc>(doc.id, doc.data() ?? {});
    const status = orderStatusForKitchenStatus(kitchenStatus);
    if (!status || !shouldSyncOrderStatus(order.status, status, order.paymentStatus)) return;
    if (operationKey && hasOperationKey(order, operationKey)) return;
    const now = new Date();
    const event = statusEventForKitchenStatus(status);
    const actorPatch = status === "preparing"
      ? { preparedBy: scope.uid ?? "" }
      : status === "served"
        ? { servedBy: scope.uid ?? "" }
        : status === "completed"
          ? { completedBy: scope.uid ?? "" }
          : {};
    const patch = cleanRecord({
      status,
      foodStatus: kitchenStatus,
      auditTimeline: FieldValue.arrayUnion(cleanRecord({ type: event, timestamp: now, user: scope.uid ?? "", role: "kitchen", restaurant: scope.tenantId, status, kitchenOrderId: doc.id })),
      statusHistory: FieldValue.arrayUnion(cleanRecord({ status, foodStatus: kitchenStatus, at: now, by: scope.uid, event })),
      operationKeys: operationKey ? FieldValue.arrayUnion(operationKey) : undefined,
      updatedAt: FieldValue.serverTimestamp(),
      ...actorPatch,
    });
    transaction.set(doc.ref, patch, { merge: true });
    transaction.set(this.db.collection("customerOrders").doc(doc.id), patch, { merge: true });
  }

}

const terminalOrders = new Set<OrderStatus>(["cancelled", "rejected"]);

function orderStatusForKitchenStatus(status: KitchenOrderStatus): OrderStatus {
  if (status === "cancelled") return "cancelled";
  return status;
}

function statusEventForKitchenStatus(status: OrderStatus) {
  if (status === "accepted") return "kitchen_accepted";
  if (status === "ready") return "kitchen_ready";
  if (status === "completed") return "completion";
  return "order_status";
}

function shouldSyncOrderStatus(current: OrderStatus | undefined, next: OrderStatus, paymentStatus: PaymentStatus | undefined) {
  if (!current || current === "draft" || current === next || terminalOrders.has(current)) return false;
  assertLegalOrderTransition({ status: current, paymentStatus }, next);
  return true;
}

function cleanRecord(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => typeof value !== "undefined"));
}

function matchesDateRange(order: KitchenOrderDoc, from?: Date, to?: Date) {
  if (!from && !to) return true;
  const fromMs = from?.getTime() ?? Number.NEGATIVE_INFINITY;
  const toMs = to?.getTime() ?? Number.POSITIVE_INFINITY;
  const created = dateMs(order.createdAt);
  const scheduled = dateMs(order.scheduledFor);
  return (created >= fromMs && created <= toMs) || (scheduled >= fromMs && scheduled <= toMs);
}
