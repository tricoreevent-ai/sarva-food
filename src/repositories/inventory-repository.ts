import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

const collections = {
  items: "inventory",
  recipes: "recipes",
  suppliers: "suppliers",
  purchases: "purchaseOrders",
  movements: "inventoryTransactions",
  audits: "auditLogs",
} as const;

export class InventoryRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    const [items, recipes, suppliers, purchaseOrders, movements, auditLogs] = await Promise.all([
      this.listCollection(collections.items, scope),
      this.listCollection(collections.recipes, scope),
      this.listCollection(collections.suppliers, scope),
      this.listCollection(collections.purchases, scope),
      this.listCollection(collections.movements, scope),
      this.listCollection(collections.audits, scope),
    ]);
    return { items, recipes, suppliers, purchaseOrders, movements, auditLogs };
  }

  async upsert(scope: TenantScope, resource: "item" | "recipe" | "supplier" | "purchase", input: Record<string, unknown>, actorId: string) {
    const collection = resource === "item" ? collections.items : resource === "recipe" ? collections.recipes : resource === "supplier" ? collections.suppliers : collections.purchases;
    const id = String(input.id || `${resource}-${crypto.randomUUID()}`);
    const ref = this.db.collection(collection).doc(id);
    const exists = (await ref.get()).exists;
    await ref.set({
      ...input,
      id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      branchId: String(input.branchId || scope.branchIds?.[0] || "main"),
      isDeleted: false,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorId,
      ...(exists ? {} : { createdAt: FieldValue.serverTimestamp(), createdBy: actorId }),
    }, { merge: true });
    await this.audit(scope, actorId, `inventory.${resource}.saved`, id, input);
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  async delete(scope: TenantScope, resource: "item" | "recipe" | "supplier" | "purchase", id: string, actorId: string) {
    const collection = resource === "item" ? collections.items : resource === "recipe" ? collections.recipes : resource === "supplier" ? collections.suppliers : collections.purchases;
    const ref = this.db.collection(collection).doc(id);
    const snapshot = await ref.get();
    this.assertTenant(scope, snapshot.data() ?? {});
    await ref.set({ isDeleted: true, active: false, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorId }, { merge: true });
    await this.audit(scope, actorId, `inventory.${resource}.deleted`, id);
    return { id };
  }

  async adjust(scope: TenantScope, id: string, delta: number, reason: string, actorId: string) {
    const ref = this.db.collection(collections.items).doc(id);
    const movementRef = this.db.collection(collections.movements).doc();
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const item = snapshot.data() ?? {};
      this.assertTenant(scope, item);
      const currentStock = Math.max(0, Number(item.currentStock ?? item.quantity ?? 0) + delta);
      transaction.set(ref, { currentStock, quantity: currentStock, lastMovementAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(movementRef, {
        id: movementRef.id,
        tenantId: scope.tenantId,
        restaurantId: scope.tenantId,
        branchId: item.branchId || scope.branchIds?.[0] || "main",
        inventoryItemId: id,
        inventoryItemName: item.name || item.itemName || "",
        movementType: delta < 0 ? "adjust" : "receive",
        quantity: delta,
        unit: item.unit || "",
        reason,
        createdBy: actorId,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    await this.audit(scope, actorId, "inventory.stock.adjusted", id, { delta, reason });
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  async receivePurchase(scope: TenantScope, id: string, actorId: string) {
    const purchaseRef = this.db.collection(collections.purchases).doc(id);
    const purchase = (await purchaseRef.get()).data() ?? {};
    this.assertTenant(scope, purchase);
    const items = Array.isArray(purchase.items) ? purchase.items as Array<Record<string, unknown>> : [];
    const batch = this.db.batch();
    for (const line of items) {
      const inventoryItemId = String(line.inventoryItemId || "");
      if (!inventoryItemId) continue;
      const inventoryRef = this.db.collection(collections.items).doc(inventoryItemId);
      const inventory = (await inventoryRef.get()).data() ?? {};
      this.assertTenant(scope, inventory);
      const quantity = Number(line.receivedQuantity ?? line.quantity ?? 0);
      const currentStock = Number(inventory.currentStock ?? inventory.quantity ?? 0) + quantity;
      batch.set(inventoryRef, { currentStock, quantity: currentStock, lastMovementAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      const movementRef = this.db.collection(collections.movements).doc();
      batch.set(movementRef, {
        id: movementRef.id,
        tenantId: scope.tenantId,
        restaurantId: scope.tenantId,
        branchId: inventory.branchId || scope.branchIds?.[0] || "main",
        inventoryItemId,
        inventoryItemName: inventory.name || inventory.itemName || line.itemName || "",
        movementType: "receive",
        quantity,
        unit: line.unit || inventory.unit || "",
        reason: `GRN ${id}`,
        purchaseOrderId: id,
        createdBy: actorId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    batch.set(purchaseRef, { status: "received", receivedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: actorId }, { merge: true });
    await batch.commit();
    await this.audit(scope, actorId, "inventory.purchase.received", id);
    return dataWithId<Record<string, unknown>>(id, (await purchaseRef.get()).data() ?? {});
  }

  private async listCollection(collection: string, scope: TenantScope) {
    return (await readTenantDocs(this.db, collection, scope, ["tenantId", "restaurantId"]))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((item) => item.isDeleted !== true)
      .sort((a, b) => Date.parse(String(b.updatedAt || b.createdAt || 0)) - Date.parse(String(a.updatedAt || a.createdAt || 0)));
  }

  private assertTenant(scope: TenantScope, data: Record<string, unknown>) {
    if (![data.tenantId, data.restaurantId].includes(scope.tenantId)) throw new Error("Inventory record is outside the active restaurant.");
  }

  private async audit(scope: TenantScope, actorId: string, action: string, entityId: string, after?: Record<string, unknown>) {
    const ref = this.db.collection(collections.audits).doc();
    await ref.set({
      id: ref.id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      branchId: scope.branchIds?.[0] || "main",
      userId: actorId,
      module: "inventory",
      action,
      entityId,
      after: after || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}
