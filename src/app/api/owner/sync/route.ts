import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { parseFirestoreDateIso } from "@/lib/firestore-date";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, DEFAULT_TENANT_ID, resolveTenantId } from "@/lib/tenant";
import { getSessionFromRequest } from "@/lib/server-auth";
import type { OfflineWrite } from "@/lib/offline/offline-queue";
import type { UserRole } from "@/types/firebase";

const operationalRoles = new Set<UserRole>([
  "owner",
  "manager",
  "cashier",
  "waiter",
  "chef",
  "kitchen-manager",
  "accountant",
  "inventory-manager",
]);

type SyncRequest = {
  entryId?: string;
  writes?: OfflineWrite[];
  forceConflict?: boolean;
};

export async function POST(request: NextRequest) {
  const session = await getOwnerSyncSession(request);

  if (!session || !operationalRoles.has(session.role)) {
    return NextResponse.json(
      { error: `Role ${session?.role ?? "guest"} cannot run owner/POS sync.` },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as SyncRequest;
  const writes = Array.isArray(body.writes) ? body.writes : [];

  if (!writes.length) {
    return NextResponse.json({ error: "No sync writes supplied." }, { status: 400 });
  }

  try {
    for (const write of writes) {
      await applyWrite(write, session, Boolean(body.forceConflict));
    }

    return NextResponse.json({ ok: true, entryId: body.entryId });
  } catch (error) {
    if (error instanceof SyncConflictError) {
      return NextResponse.json({ error: error.message, conflict: error.conflict }, { status: 409 });
    }
    if (error instanceof OwnerSyncAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Owner sync failed." },
      { status: 500 },
    );
  }
}

async function getOwnerSyncSession(request: NextRequest) {
  try {
    return await getSessionFromRequest(request, "owner");
  } catch {
    return null;
  }
}

async function applyWrite(
  write: OfflineWrite,
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>,
  forceConflict: boolean,
) {
  const tenantId = stringValue(write.tenantId ?? write.data?.tenantId) ?? DEFAULT_TENANT_ID;
  const branchId = stringValue(write.branchId ?? write.data?.branchId) ?? DEFAULT_BRANCH_ID;
  assertSessionAccess(session, tenantId, branchId);

  const db = adminDb();
  const target = write.docId
    ? db.collection(write.collectionName).doc(write.docId)
    : db.collection(write.collectionName).doc();

  if (!forceConflict && write.docId && write.baseUpdatedAt) {
    const snapshot = await target.get();
    const remote = snapshot.exists ? snapshot.data() ?? null : null;
    const remoteUpdatedAt = timestampToComparable(remote?.updatedAt);
    if (remote && remoteUpdatedAt && remoteUpdatedAt !== write.baseUpdatedAt) {
      throw new SyncConflictError({
        collectionName: write.collectionName,
        docId: write.docId,
        local: write.data ?? {},
        remote,
      });
    }
  }

  if (write.operation === "delete") {
    await target.set(sanitizeFirestoreData(softDeleteMetadata(write, session.uid)), { merge: true });
    return;
  }

  const payload = sanitizeFirestoreData({
    ...(write.operation === "set" ? createMetadata(write, session.uid) : {}),
    ...(write.data ?? {}),
    ...updateMetadata(write, session.uid),
  });

  if (write.operation === "update") {
    await target.update(payload);
    return;
  }

  await target.set(payload, { merge: write.merge ?? true });
}

function assertSessionAccess(
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>,
  tenantId: string,
  branchId: string,
) {
  const allowedTenants = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean));
  if (!allowedTenants.has(tenantId)) {
    throw new OwnerSyncAccessError(`Access setup required: this user is not linked to restaurant ${tenantId}.`);
  }

  if (session.branchIds.length && !session.branchIds.includes(branchId)) {
    throw new OwnerSyncAccessError(`Access setup required: this user is not linked to branch ${branchId}.`);
  }
}

function createMetadata(write: OfflineWrite, actor: string) {
  const restaurantId = stringValue(write.data?.restaurantId) ?? DEFAULT_RESTAURANT_ID;
  return {
    tenantId: stringValue(write.tenantId ?? write.data?.tenantId) ?? resolveTenantId(restaurantId),
    restaurantId,
    branchId: stringValue(write.branchId ?? write.data?.branchId) ?? DEFAULT_BRANCH_ID,
    createdBy: actor,
    updatedBy: actor,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
  };
}

function updateMetadata(write: OfflineWrite, actor: string) {
  const restaurantId = stringValue(write.data?.restaurantId) ?? DEFAULT_RESTAURANT_ID;
  return {
    tenantId: stringValue(write.tenantId ?? write.data?.tenantId) ?? resolveTenantId(restaurantId),
    restaurantId,
    branchId: stringValue(write.branchId ?? write.data?.branchId) ?? DEFAULT_BRANCH_ID,
    updatedBy: actor,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function softDeleteMetadata(write: OfflineWrite, actor: string) {
  return {
    ...updateMetadata(write, actor),
    isDeleted: true,
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: actor,
  };
}

function sanitizeFirestoreData(input: Record<string, unknown>) {
  return sanitizeFirestoreValue(input) as Record<string, unknown>;
}

function sanitizeFirestoreValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(sanitizeFirestoreValue).filter((entry) => entry !== undefined);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, sanitizeFirestoreValue(entry)] as const)
        .filter(([, entry]) => entry !== undefined),
    );
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function timestampToComparable(value: unknown) {
  return parseFirestoreDateIso(value) ?? null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

class SyncConflictError extends Error {
  conflict: {
    collectionName: string;
    docId: string;
    local: Record<string, unknown>;
    remote: Record<string, unknown>;
  };

  constructor(conflict: SyncConflictError["conflict"]) {
    super("Offline sync conflict");
    this.conflict = conflict;
  }
}

class OwnerSyncAccessError extends Error {}
