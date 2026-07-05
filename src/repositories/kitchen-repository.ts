import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import type { KitchenOrderDoc, KitchenOrderStatus } from "@/types/firebase";
import { dataWithId, dateMs, readTenantDocs, type TenantScope } from "@/repositories/shared";

const statusFlow: KitchenOrderStatus[] = ["new", "accepted", "preparing", "ready", "served", "completed"];
type KitchenOrderPatch = Partial<KitchenOrderDoc> & { printedCountIncrement?: number };
type KitchenUpdateResult = KitchenOrderDoc & { unchanged?: boolean };

export class KitchenRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope, options: { from?: Date; to?: Date; limit?: number } = {}) {
    return (await readTenantDocs(this.db, "kitchenOrders", scope, ["tenantId", "restaurantId"], options.limit ?? 200))
      .map((doc) => dataWithId<KitchenOrderDoc>(doc.id, doc.data()))
      .filter((order) => matchesDateRange(order, options.from, options.to))
      .sort((first, second) => dateMs(second.createdAt) - dateMs(first.createdAt));
  }

  async create(scope: TenantScope, input: Partial<KitchenOrderDoc>) {
    const ref = input.id ? this.db.collection("kitchenOrders").doc(input.id) : this.db.collection("kitchenOrders").doc();
    const lines = Array.isArray(input.lines) ? input.lines : [];
    const subtotal = Number(input.subtotal ?? lines.reduce((sum, line) => sum + Number(line.price ?? 0) * Number(line.quantity ?? 0), 0));
    const order = {
      ...input,
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
      preparedBy: input.preparedBy ?? "",
      servedBy: input.servedBy ?? "",
      completedBy: input.completedBy ?? "",
      printedCount: Number(input.printedCount ?? 0),
      lastPrintedAt: input.lastPrintedAt ?? null,
      etaMinutes: Number(input.etaMinutes ?? 12),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(order, { merge: true });
    return dataWithId<KitchenOrderDoc>(ref.id, (await ref.get()).data() ?? order);
  }

  async update(scope: TenantScope, id: string, patch: KitchenOrderPatch) {
    const current = await this.assertTenant(scope, id);
    const sameStatus = Boolean(patch.status && current.status === patch.status);
    const hasMaterialPatch = Object.entries(patch).some(([key, value]) => (
      typeof value !== "undefined" && !["id", "tenantId", "restaurantId", "status"].includes(key)
    ));
    if (sameStatus && !hasMaterialPatch) return { ...dataWithId<KitchenOrderDoc>(id, current), unchanged: true } satisfies KitchenUpdateResult;
    if (patch.status && current.status && !sameStatus && !isValidStatusTransition(current.status, patch.status)) {
      throw new Error(`Invalid kitchen status transition from ${current.status} to ${patch.status}.`);
    }
    const { printedCountIncrement, ...safePatch } = patch;
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
      printedCount: printIncrement > 0 ? FieldValue.increment(printIncrement) : safePatch.printedCount,
      lastPrintedAt: printIncrement > 0 ? FieldValue.serverTimestamp() : safePatch.lastPrintedAt,
      subtotal,
      total: safePatch.total ?? subtotal,
      updatedAt: FieldValue.serverTimestamp(),
    }).filter(([, value]) => typeof value !== "undefined"));
    await this.db.collection("kitchenOrders").doc(id).set(next, { merge: true });
    const snapshot = await this.db.collection("kitchenOrders").doc(id).get();
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
}

function isValidStatusTransition(current: KitchenOrderStatus, next: KitchenOrderStatus) {
  if (current === next) return true;
  if (next === "cancelled") return current !== "completed";
  const currentIndex = statusFlow.indexOf(current);
  const nextIndex = statusFlow.indexOf(next);
  if (currentIndex < 0 || nextIndex < 0) return false;
  if (current === "ready" && next === "completed") return true;
  return nextIndex === currentIndex + 1;
}

function matchesDateRange(order: KitchenOrderDoc, from?: Date, to?: Date) {
  if (!from && !to) return true;
  const fromMs = from?.getTime() ?? Number.NEGATIVE_INFINITY;
  const toMs = to?.getTime() ?? Number.POSITIVE_INFINITY;
  const created = dateMs(order.createdAt);
  const scheduled = dateMs(order.scheduledFor);
  return (created >= fromMs && created <= toMs) || (scheduled >= fromMs && scheduled <= toMs);
}
