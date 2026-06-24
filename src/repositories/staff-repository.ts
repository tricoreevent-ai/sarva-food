import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import type { StaffMember } from "@/lib/types";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class StaffRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    return (await readTenantDocs(this.db, "users", scope, ["tenantId", "restaurantIds"]))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((user) => user.role !== "customer" && user.active !== false);
  }

  async upsert(scope: TenantScope, input: Partial<StaffMember>) {
    const id = input.id || `staff-${scope.tenantId}-${Date.now()}`;
    const ref = this.db.collection("users").doc(id);
    await ref.set({
      id,
      uid: id,
      displayName: input.name || "Staff member",
      name: input.name || "Staff member",
      email: input.email || "",
      phone: input.phone || "",
      role: input.role || "waiter",
      roleId: input.roleId || input.role || "waiter",
      tenantId: scope.tenantId,
      tenantIds: [scope.tenantId],
      restaurantIds: [scope.tenantId],
      branchId: input.branchId || scope.branchIds?.[0] || "main",
      branchIds: [input.branchId || scope.branchIds?.[0] || "main"],
      permissions: input.permissions || [],
      active: input.status !== "off-duty",
      status: input.status || "active",
      requiresLogin: input.requiresLogin !== false,
      employmentType: input.employmentType || "fixed",
      monthlySalary: Number(input.monthlySalary ?? 0),
      contractRate: Number(input.contractRate ?? 0),
      panNumber: input.panNumber || "",
      pfNumber: input.pfNumber || "",
      esiNumber: input.esiNumber || "",
      professionalTaxState: input.professionalTaxState || "",
      tdsSection: input.tdsSection || "salary",
      payrollEstimate: input.payrollEstimate || null,
      lastActivity: input.lastActivity || "Repository synced",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  async delete(scope: TenantScope, id: string) {
    const snapshot = await this.db.collection("users").doc(id).get();
    const user = snapshot.data() ?? {};
    if (![user.tenantId, ...(Array.isArray(user.restaurantIds) ? user.restaurantIds : [])].includes(scope.tenantId)) throw new Error("Staff member is outside the active restaurant.");
    await this.db.collection("users").doc(id).set({ active: false, status: "off-duty", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { id };
  }
}
