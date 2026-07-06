import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { assertLegalKitchenTransition } from "@/lib/order-state-machine";
import { hasOperationKey } from "@/lib/server/operation-idempotency";
import type { KitchenOrderDoc, KitchenOrderStatus, OrderDoc, OrderLineDoc } from "@/types/firebase";
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
        if (operationKey && hasOperationKey(current, operationKey)) {
          existing = current;
          return;
        }
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
      if (patch.status && current.status && patch.status !== current.status) assertLegalKitchenTransition(current.status, patch.status);
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
    });
    if (unchanged) return { ...dataWithId<KitchenOrderDoc>(id, current), unchanged: true } satisfies KitchenUpdateResult;
    if (patch.status === "ready" && (current as Partial<KitchenOrderDoc> & { parentKitchenOrderId?: string }).parentKitchenOrderId) {
      await this.mergeIncrementalIntoParent(scope, id, current);
    }
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

  private async mergeIncrementalIntoParent(scope: TenantScope, childId: string, child: Partial<KitchenOrderDoc>) {
    const parentId = String((child as Partial<KitchenOrderDoc> & { parentKitchenOrderId?: string }).parentKitchenOrderId ?? "");
    if (!parentId) return;
    const parentRef = this.db.collection("kitchenOrders").doc(parentId);
    const orderQuery = this.db.collection("orders").where("kitchenOrderId", "==", parentId).limit(1);
    await this.db.runTransaction(async (transaction) => {
      const parentSnapshot = await transaction.get(parentRef);
      const orderSnapshot = await transaction.get(orderQuery);
      if (!parentSnapshot.exists) return;
      const parent = dataWithId<KitchenOrderDoc>(parentSnapshot.id, parentSnapshot.data() ?? {});
      if (![parent.tenantId, parent.restaurantId].includes(scope.tenantId)) return;
      const mergedIds = Array.isArray(parent.incrementalKitchenOrderIds) ? parent.incrementalKitchenOrderIds : [];
      if (mergedIds.includes(childId)) return;
      const childLines = Array.isArray(child.lines) ? child.lines : [];
      const parentLines = mergeKitchenLines(parent.lines ?? [], childLines);
      const subtotal = parentLines.reduce((sum, line) => sum + Number(line.price ?? 0) * Number(line.quantity ?? 0), 0);
      const now = new Date();
      transaction.set(parentRef, {
        lines: parentLines,
        subtotal,
        total: subtotal + Number(parent.tax ?? 0),
        incrementalKitchenOrderIds: FieldValue.arrayUnion(childId),
        statusHistory: FieldValue.arrayUnion({ event: "incremental_kot_merged", status: "ready", childKitchenOrderId: childId, at: now.toISOString() }),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      const orderDoc = orderSnapshot.docs.find((doc) => {
        const data = doc.data() as Partial<OrderDoc>;
        return [data.tenantId, data.restaurantId].includes(scope.tenantId);
      });
      if (!orderDoc) return;
      const order = dataWithId<OrderDoc>(orderDoc.id, orderDoc.data() ?? {});
      const orderLines = mergeOrderLines(order.lines ?? [], childLines);
      const orderSubtotal = orderLines.reduce((sum, line) => sum + Number(line.price ?? 0) * Number(line.quantity ?? 0), 0);
      const total = orderSubtotal - Number(order.discount ?? 0) + Number(order.tax ?? 0) + Number(order.deliveryFee ?? 0);
      const audit = {
        type: "incremental_kot_merged",
        timestamp: now,
        user: scope.uid ?? "",
        role: "kitchen",
        device: "kitchen-ready",
        restaurant: scope.tenantId,
        childKitchenOrderId: childId,
        parentKitchenOrderId: parentId,
        lines: childLines.map((line) => ({ name: line.name, quantity: line.quantity })),
      };
      const orderPatch = {
        lines: orderLines,
        subtotal: orderSubtotal,
        total,
        auditTimeline: FieldValue.arrayUnion(audit),
        statusHistory: FieldValue.arrayUnion({ event: "incremental_kot_merged", at: now, by: scope.uid ?? "", childKitchenOrderId: childId }),
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.set(this.db.collection("orders").doc(order.id), orderPatch, { merge: true });
      transaction.set(this.db.collection("customerOrders").doc(order.id), orderPatch, { merge: true });
    });
  }
}

function mergeKitchenLines(parent: KitchenOrderDoc["lines"], child: KitchenOrderDoc["lines"]) {
  const lines = new Map<string, KitchenOrderDoc["lines"][number]>();
  for (const line of [...parent, ...child]) {
    const item = line as KitchenOrderDoc["lines"][number] & { itemId?: string };
    const key = String(item.itemId ?? line.menuItemId ?? line.name);
    const existing = lines.get(key);
    lines.set(key, existing ? { ...existing, quantity: Number(existing.quantity ?? 0) + Number(line.quantity ?? 0) } : { ...line, quantity: Number(line.quantity ?? 0) });
  }
  return Array.from(lines.values()).filter((line) => Number(line.quantity ?? 0) > 0);
}

function mergeOrderLines(parent: OrderLineDoc[], child: KitchenOrderDoc["lines"]) {
  const lines = new Map<string, OrderLineDoc>();
  for (const line of parent) lines.set(line.menuItemId || line.name, { ...line, quantity: Number(line.quantity ?? 0) });
  for (const line of child) {
    const item = line as KitchenOrderDoc["lines"][number] & { itemId?: string };
    const key = String(line.menuItemId ?? item.itemId ?? line.name);
    const existing = lines.get(key);
    lines.set(key, existing
      ? { ...existing, quantity: Number(existing.quantity ?? 0) + Number(line.quantity ?? 0) }
      : { menuItemId: key, name: String(line.name ?? "Item"), price: Number(line.price ?? 0), quantity: Number(line.quantity ?? 0), notes: line.notes });
  }
  return Array.from(lines.values()).filter((line) => Number(line.quantity ?? 0) > 0);
}

function matchesDateRange(order: KitchenOrderDoc, from?: Date, to?: Date) {
  if (!from && !to) return true;
  const fromMs = from?.getTime() ?? Number.NEGATIVE_INFINITY;
  const toMs = to?.getTime() ?? Number.POSITIVE_INFINITY;
  const created = dateMs(order.createdAt);
  const scheduled = dateMs(order.scheduledFor);
  return (created >= fromMs && created <= toMs) || (scheduled >= fromMs && scheduled <= toMs);
}
