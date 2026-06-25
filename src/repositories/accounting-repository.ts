import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class AccountingRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    return (await readTenantDocs(this.db, "accountingEntries", scope, ["tenantId", "restaurantId"]))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((entry) => entry.isDeleted !== true)
      .sort((a, b) => Date.parse(String(b.createdAt || 0)) - Date.parse(String(a.createdAt || 0)));
  }

  async upsert(scope: TenantScope, input: Record<string, unknown>, actorId: string) {
    const id = String(input.id || `acc-${crypto.randomUUID()}`);
    const ref = this.db.collection("accountingEntries").doc(id);
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
      ...(exists ? {} : { createdAt: input.createdAt || FieldValue.serverTimestamp(), createdBy: actorId }),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  async delete(scope: TenantScope, id: string, actorId: string) {
    const ref = this.db.collection("accountingEntries").doc(id);
    const snapshot = await ref.get();
    const data = snapshot.data() ?? {};
    if (![data.tenantId, data.restaurantId].includes(scope.tenantId)) throw new Error("Accounting entry is outside the active restaurant.");
    await ref.set({ isDeleted: true, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorId }, { merge: true });
    return { id };
  }
}
