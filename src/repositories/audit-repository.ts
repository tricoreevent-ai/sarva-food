import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { dataWithId, readTenantDocs, type TenantScope } from "@/repositories/shared";

export type AuditRecord = {
  id?: string;
  tenantId: string;
  restaurantId?: string;
  branchId?: string;
  userId: string;
  userName?: string;
  role?: string;
  action: string;
  module: string;
  entityId?: string;
  note?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  createdAt?: unknown;
};

export class AuditRepository {
  private readonly db = adminDb();

  async record(input: AuditRecord) {
    const ref = input.id ? this.db.collection("auditLogs").doc(input.id) : this.db.collection("auditLogs").doc();
    await ref.set(clean({ ...input, id: ref.id, createdAt: input.createdAt ?? FieldValue.serverTimestamp() }), { merge: true });
    return ref.id;
  }

  async list(scope: TenantScope, filters: { action?: string; module?: string; userId?: string; from?: string; to?: string; limit?: number } = {}) {
    return (await readTenantDocs(this.db, "auditLogs", scope, ["tenantId", "restaurantId"], filters.limit ?? 500))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((row) => !filters.action || row.action === filters.action)
      .filter((row) => !filters.module || row.module === filters.module)
      .filter((row) => !filters.userId || row.userId === filters.userId)
      .filter((row) => !filters.from || String(row.createdAt ?? "") >= filters.from)
      .filter((row) => !filters.to || String(row.createdAt ?? "") <= filters.to)
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  }

  async openSession(input: AuditRecord & { sessionId: string }) {
    await this.db.collection("userSessions").doc(input.sessionId).set(clean({
      ...input,
      id: input.sessionId,
      active: true,
      loginAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
    }), { merge: true });
  }

  async closeSessions(userId: string) {
    const snapshot = await this.db.collection("userSessions").where("userId", "==", userId).where("active", "==", true).get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.set({ active: false, logoutAt: FieldValue.serverTimestamp() }, { merge: true })));
  }

  async closeLatestSession(userId: string) {
    const snapshot = await this.db.collection("userSessions").where("userId", "==", userId).where("active", "==", true).limit(20).get();
    const latest = snapshot.docs
      .map((doc) => ({ doc, value: doc.data() }))
      .sort((a, b) => timestampMs(b.value.loginAt) - timestampMs(a.value.loginAt))[0];
    if (latest) await latest.doc.ref.set({ active: false, logoutAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  async sessions(scope: TenantScope, userId?: string) {
    return (await readTenantDocs(this.db, "userSessions", scope, ["tenantId", "restaurantId"], 500))
      .map((doc) => dataWithId<Record<string, unknown>>(doc.id, doc.data()))
      .filter((row) => !userId || row.userId === userId)
      .sort((a, b) => String(b.loginAt ?? "").localeCompare(String(a.loginAt ?? "")));
  }
}

function timestampMs(value: unknown) {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "string") return Date.parse(value) || 0;
  return 0;
}

function clean(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
