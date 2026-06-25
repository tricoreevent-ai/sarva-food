import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class OfferRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    return (await readTenantDocs(this.db, "offers", scope, ["tenantId", "restaurantId", "restaurantSlug"]))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((offer) => offer.isDeleted !== true)
      .sort((first, second) => Number(second.priority ?? 0) - Number(first.priority ?? 0));
  }

  async upsert(scope: TenantScope, input: Record<string, unknown>) {
    const code = String(input.code || input.id || "").trim().toUpperCase();
    if (!code) throw new Error("Offer code is required.");
    const ref = this.db.collection("offers").doc(code);
    const exists = (await ref.get()).exists;
    await ref.set({
      ...input,
      id: code,
      code,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      restaurantSlug: scope.tenantId,
      branchId: String(input.branchId || scope.branchIds?.[0] || "main"),
      isDeleted: false,
      updatedAt: FieldValue.serverTimestamp(),
      ...(exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(code, (await ref.get()).data() ?? {});
  }

  async delete(scope: TenantScope, code: string) {
    const ref = this.db.collection("offers").doc(code.trim().toUpperCase());
    const snapshot = await ref.get();
    const data = snapshot.data() ?? {};
    if (![data.tenantId, data.restaurantId, data.restaurantSlug].includes(scope.tenantId)) throw new Error("Offer is outside the active restaurant.");
    await ref.delete();
    return { code: code.trim().toUpperCase() };
  }
}
