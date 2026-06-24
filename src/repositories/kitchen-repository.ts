import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import type { KitchenOrderDoc, KitchenOrderStatus } from "@/types/firebase";
import { dataWithId, dateMs, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class KitchenRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope, limit = 200) {
    return (await readTenantDocs(this.db, "kitchenOrders", scope, ["tenantId", "restaurantId"], limit))
      .map((doc) => dataWithId<KitchenOrderDoc>(doc.id, doc.data()))
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
      priority: input.priority || "normal",
      lines,
      subtotal,
      tax: Number(input.tax ?? 0),
      total: Number(input.total ?? subtotal),
      paymentStatus: input.paymentStatus || "pending",
      etaMinutes: Number(input.etaMinutes ?? 12),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(order, { merge: true });
    return dataWithId<KitchenOrderDoc>(ref.id, (await ref.get()).data() ?? order);
  }

  async update(scope: TenantScope, id: string, patch: Partial<KitchenOrderDoc>) {
    await this.assertTenant(scope, id);
    const lines = Array.isArray(patch.lines) ? patch.lines : undefined;
    const subtotal = lines ? lines.reduce((sum, line) => sum + Number(line.price ?? 0) * Number(line.quantity ?? 0), 0) : undefined;
    const next = Object.fromEntries(Object.entries({
      ...patch,
      tenantId: undefined,
      restaurantId: undefined,
      id: undefined,
      subtotal,
      total: patch.total ?? subtotal,
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
    const order = snapshot.data() ?? {};
    if (![order.tenantId, order.restaurantId].includes(scope.tenantId)) throw new Error("Kitchen order is outside the active restaurant.");
  }
}
