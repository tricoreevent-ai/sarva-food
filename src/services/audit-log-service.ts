"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { shouldUseFirebase } from "@/lib/env";
import { enqueueOfflineOperation } from "@/lib/offline";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, DEFAULT_TENANT_ID } from "@/lib/tenant";

export type AuditAction =
  | "login"
  | "logout"
  | "bill_edit"
  | "bill_cancel"
  | "bill_delete"
  | "refund"
  | "delivery_return"
  | "kot_print"
  | "menu_edit"
  | "inventory_edit"
  | "accounting_entry"
  | "role_update"
  | "permission_update"
  | "user_create"
  | "force_logout"
  | "password_reset";

export async function recordAuditLog(input: {
  action: AuditAction;
  actorId: string;
  actorName?: string;
  targetId?: string;
  module: string;
  note?: string;
  tenantId?: string;
  branchId?: string;
}) {
  const createdAt = new Date().toISOString();
  const payload = {
    tenantId: input.tenantId ?? DEFAULT_TENANT_ID,
    restaurantId: DEFAULT_RESTAURANT_ID,
    branchId: input.branchId ?? DEFAULT_BRANCH_ID,
    action: input.action,
    actorId: input.actorId,
    actorName: input.actorName,
    targetId: input.targetId,
    module: input.module,
    note: input.note,
    createdAt,
  };

  if (shouldUseFirebase() && isFirebaseConfigured && typeof window !== "undefined") {
    try {
      await addDoc(collection(getFirebaseDb(), "auditLogs"), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    } catch {
      // Offline/audit writes must not block operations.
    }
  }

  await enqueueOfflineOperation({
    module: "accounting",
    action: `Audit ${input.action}`,
    writes: [
      {
        collectionName: "auditLogs",
        operation: "set",
        merge: true,
        tenantId: payload.tenantId,
        branchId: payload.branchId,
        data: payload,
      },
    ],
  }).catch(() => undefined);
}
