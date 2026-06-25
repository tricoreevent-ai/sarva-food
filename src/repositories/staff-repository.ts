import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "node:crypto";
import { adminAuth, adminDb } from "@/firebase/admin";
import { AuditRepository } from "@/repositories/audit-repository";
import type { StaffMember } from "@/lib/types";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export class StaffRepository {
  private readonly db = adminDb();

  async list(scope: TenantScope) {
    return (await readTenantDocs(this.db, "users", scope, ["tenantId", "restaurantIds"]))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((user) => user.role !== "customer");
  }

  async upsert(scope: TenantScope, input: Partial<StaffMember>) {
    const email = input.email?.trim().toLowerCase() || "";
    if (input.role === "owner" || input.role === "admin") throw new Error("Protected roles cannot be assigned from staff management.");
    if (input.id) await this.assertManageable(scope, input.id);
    let authUser = input.id ? await adminAuth().getUser(input.id).catch(() => null) : null;
    if (!authUser && email) authUser = await adminAuth().getUserByEmail(email).catch(() => null);
    if (authUser && !input.id) await this.assertManageable(scope, authUser.uid);
    if (!authUser && email && input.requiresLogin !== false) {
      authUser = await adminAuth().createUser({
        email,
        displayName: input.name || "Staff member",
        password: randomBytes(18).toString("base64url"),
        disabled: input.status === "off-duty",
      });
    }
    if (authUser) {
      await adminAuth().updateUser(authUser.uid, {
        email: email || authUser.email,
        displayName: input.name || authUser.displayName,
        disabled: input.status === "off-duty",
      });
    }
    const id = authUser?.uid || input.id || `staff-${scope.tenantId}-${Date.now()}`;
    const ref = this.db.collection("users").doc(id);
    const existing = await ref.get();
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
      createdAt: existing.exists ? existing.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    }, { merge: true });
    return dataWithId<Record<string, unknown>>(id, (await ref.get()).data() ?? {});
  }

  async setDisabled(scope: TenantScope, id: string, disabled: boolean) {
    const snapshot = await this.db.collection("users").doc(id).get();
    const user = snapshot.data() ?? {};
    this.assertManageableData(scope, user);
    await adminAuth().updateUser(id, { disabled }).catch(() => undefined);
    if (disabled) {
      await adminAuth().revokeRefreshTokens(id).catch(() => undefined);
      await new AuditRepository().closeSessions(id);
    }
    await snapshot.ref.set({ active: !disabled, status: disabled ? "off-duty" : "active", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return dataWithId<Record<string, unknown>>(id, (await snapshot.ref.get()).data() ?? {});
  }

  async resetPassword(scope: TenantScope, id: string) {
    const snapshot = await this.db.collection("users").doc(id).get();
    const user = snapshot.data() ?? {};
    this.assertManageableData(scope, user);
    const email = String(user.email || "");
    if (!email) throw new Error("Staff email is required for password reset.");
    await adminAuth().revokeRefreshTokens(id);
    await new AuditRepository().closeSessions(id);
    return { id, email, resetLink: await adminAuth().generatePasswordResetLink(email) };
  }

  async delete(scope: TenantScope, id: string) {
    const snapshot = await this.db.collection("users").doc(id).get();
    const user = snapshot.data() ?? {};
    this.assertManageableData(scope, user);
    await Promise.all([
      adminAuth().deleteUser(id).catch(() => undefined),
      new AuditRepository().closeSessions(id),
      snapshot.ref.delete(),
    ]);
    return { id };
  }

  async withSessions(scope: TenantScope) {
    const [users, sessions] = await Promise.all([this.list(scope), new AuditRepository().sessions(scope)]);
    return users.map((user) => {
      const history = sessions.filter((session) => session.userId === user.id);
      return {
        ...user,
        activeSessions: history.filter((session) => session.active === true).length,
        loginHistory: history.slice(0, 20),
      };
    });
  }

  private async assertManageable(scope: TenantScope, id: string) {
    const snapshot = await this.db.collection("users").doc(id).get();
    if (!snapshot.exists) throw new Error("Staff member not found.");
    this.assertManageableData(scope, snapshot.data() ?? {});
  }

  private assertManageableData(scope: TenantScope, user: Record<string, unknown>) {
    if (![user.tenantId, ...(Array.isArray(user.restaurantIds) ? user.restaurantIds : [])].includes(scope.tenantId)) throw new Error("Staff member is outside the active restaurant.");
    if (user.role === "owner" || user.role === "admin" || user.role === "super_admin") throw new Error("Protected users cannot be changed from staff management.");
  }
}
