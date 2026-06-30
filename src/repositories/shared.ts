import "server-only";

import type { DocumentData, Firestore } from "firebase-admin/firestore";
import type { VerifiedSession } from "@/lib/server-auth";
import { resolveTenantId, tenantAliases } from "@/lib/tenant";
import type { UserRole } from "@/types/firebase";

export const ownerReadRoles = new Set<UserRole>([
  "owner",
  "manager",
  "cashier",
  "waiter",
  "chef",
  "kitchen-manager",
  "accountant",
  "inventory-manager",
]);

export type TenantScope = {
  tenantId: string;
  branchIds?: string[];
  uid?: string;
};

export function tenantScope(session: VerifiedSession, requested?: string | null): TenantScope {
  const tenantId = resolveTenantId(requested || session.tenantId || session.tenantIds[0]);
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean).map(resolveTenantId));
  if (allowed.size && !allowed.has(tenantId)) {
    throw new Error("This account is not linked to the requested restaurant.");
  }
  return { tenantId, branchIds: session.branchIds, uid: session.uid };
}

export async function readTenantDocs(
  db: Firestore,
  collection: string,
  scope: TenantScope,
  fields: readonly string[] = ["tenantId", "restaurantId"],
  max = 500,
) {
  const ids = tenantAliases(scope.tenantId);
  const snapshots = await Promise.all(
    ids.flatMap((id) => fields.map((field) => db.collection(collection).where(field, "==", id).limit(max).get())),
  );
  return Array.from(new Map(snapshots.flatMap((snapshot) => snapshot.docs).map((doc) => [doc.id, doc])).values());
}

export function serializeFirestore<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  if ("toDate" in value && typeof value.toDate === "function") return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map(serializeFirestore) as T;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, serializeFirestore(entry)] as const)
      .filter(([, entry]) => typeof entry !== "undefined"),
  ) as T;
}

export function dataWithId<T extends Record<string, unknown>>(id: string, data: DocumentData) {
  return { id, ...serializeFirestore(data) } as unknown as T;
}

export function dateMs(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return Date.parse(value);
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}
