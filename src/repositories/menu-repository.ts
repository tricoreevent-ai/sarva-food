import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class MenuRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    const docs = await Promise.all(["menus", "menuItems"].map((collection) => readTenantDocs(this.db, collection, scope)));
    return Array.from(new Map(docs.flat().map((doc) => [doc.id, dataWithId<Record<string, unknown>>(doc.id, doc.data())])).values())
      .filter((item) => item.isDeleted !== true)
      .sort((first, second) => Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0) || String(first.name ?? "").localeCompare(String(second.name ?? "")));
  }

  async upsert(scope: TenantScope, input: Record<string, unknown>) {
    const id = String(input.id || `menu-${crypto.randomUUID()}`);
    const ref = this.db.collection("menus").doc(id);
    const exists = (await ref.get()).exists;
    await ref.set({
      ...input,
      id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      restaurantSlug: scope.tenantId,
      branchId: String(input.branchId || scope.branchIds?.[0] || "main"),
      isDeleted: false,
      updatedAt: FieldValue.serverTimestamp(),
      ...(exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  async delete(scope: TenantScope, id: string) {
    const ref = this.db.collection("menus").doc(id);
    const snapshot = await ref.get();
    const data = snapshot.data() ?? {};
    if (![data.tenantId, data.restaurantId, data.restaurantSlug].includes(scope.tenantId)) throw new Error("Menu item is outside the active restaurant.");
    await ref.set({ isDeleted: true, active: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { id };
  }
}
