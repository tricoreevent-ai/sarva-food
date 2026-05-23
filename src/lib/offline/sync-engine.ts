import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { shouldUseFirebase } from "@/lib/env";
import { isOnline, subscribeConnectivity } from "@/lib/offline/connectivity-monitor";
import { cleanupStaleOfflineCache } from "@/lib/offline/offline-storage";
import { assertCanSyncTenant, resolveOperationalAccess } from "@/lib/operational-access";
import {
  deleteOfflineQueueEntry,
  getOfflineQueue,
  type OfflineQueueEntry,
  type OfflineWrite,
  requestServiceWorkerSync,
  updateOfflineQueueEntry,
} from "@/lib/offline/offline-queue";
import { getNextRetryAt, shouldRetry } from "@/lib/offline/retry-manager";
import { createMetadata, softDeleteMetadata, updateMetadata } from "@/services/firestore-metadata";

let syncInFlight: Promise<void> | null = null;
let started = false;
let lastSyncAttemptAt = 0;
const BACKGROUND_SYNC_INTERVAL_MS = 60_000;
const MIN_SYNC_GAP_MS = 15_000;

function canSync() {
  return (
    typeof window !== "undefined" &&
    isOnline() &&
    shouldUseFirebase() &&
    isFirebaseConfigured &&
    Boolean(getFirebaseAuth().currentUser)
  );
}

function shouldProcess(entry: OfflineQueueEntry) {
  if (entry.status === "synced" || entry.status === "conflict") return false;
  if (!entry.nextAttemptAt) return true;
  return new Date(entry.nextAttemptAt).getTime() <= Date.now();
}

export function startOfflineSyncEngine() {
  if (started || typeof window === "undefined") return;
  started = true;

  subscribeConnectivity((snapshot) => {
    if (snapshot.online) {
      void syncQueuedOperations();
    }
  });

  window.setInterval(() => {
    void syncQueuedOperations();
  }, BACKGROUND_SYNC_INTERVAL_MS);

  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "SARVA_SYNC_QUEUE") {
      void syncQueuedOperations();
    }
  });

  void requestServiceWorkerSync();
  void cleanupStaleOfflineCache();
  void syncQueuedOperations();
}

export async function syncQueuedOperations(options: { forceConflicts?: boolean } = {}) {
  if (!canSync()) return;
  if (!options.forceConflicts && Date.now() - lastSyncAttemptAt < MIN_SYNC_GAP_MS) return syncInFlight ?? undefined;
  lastSyncAttemptAt = Date.now();
  syncInFlight ??= runSync(options).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function runSync(options: { forceConflicts?: boolean }) {
  const entries = (await getOfflineQueue()).filter(shouldProcess);
  if (!entries.length) return;

  const access = await resolveOperationalAccess().catch(() => null);
  if (!access?.allowed) return;

  for (const entry of entries) {
    await syncEntry(entry, options);
  }
}

async function syncEntry(
  entry: OfflineQueueEntry,
  options: { forceConflicts?: boolean },
) {
  await updateOfflineQueueEntry(entry.id, {
    status: "retrying",
    attempts: entry.attempts + 1,
    lastAttemptAt: new Date().toISOString(),
    lastError: undefined,
  });

  try {
    for (const write of entry.writes) {
      await applyWrite(write, options.forceConflicts ?? false);
    }

    await updateOfflineQueueEntry(entry.id, {
      status: "synced",
      syncedAt: new Date().toISOString(),
      nextAttemptAt: undefined,
      lastError: undefined,
    });
    await deleteOfflineQueueEntry(entry.id);
  } catch (error) {
    if (error instanceof ConflictError) {
      await updateOfflineQueueEntry(entry.id, {
        status: "conflict",
        lastError: "Remote data changed before this offline update could sync.",
        conflict: error.conflict,
      });
      return;
    }

    const attempts = entry.attempts + 1;
    await updateOfflineQueueEntry(entry.id, {
      status: shouldRetry(attempts) ? "failed" : "failed",
      attempts,
      lastError: error instanceof Error ? error.message : "Sync failed.",
      nextAttemptAt: shouldRetry(attempts) ? getNextRetryAt(attempts) : undefined,
    });
  }
}

async function applyWrite(write: OfflineWrite, forceConflict: boolean) {
  await assertCanSyncTenant({
    tenantId: typeof (write.tenantId ?? write.data?.tenantId) === "string" ? (write.tenantId ?? write.data?.tenantId) as string : undefined,
    branchId: typeof (write.branchId ?? write.data?.branchId) === "string" ? (write.branchId ?? write.data?.branchId) as string : undefined,
  });

  const db = getFirebaseDb();
  const target = write.docId
    ? doc(db, write.collectionName, write.docId)
    : doc(db, write.collectionName);

  if (!forceConflict && write.docId && write.baseUpdatedAt) {
    const snapshot = await getDoc(target);
    const remote = snapshot.exists() ? snapshot.data() : null;
    const remoteUpdatedAt = timestampToComparable(remote?.updatedAt);
    if (remote && remoteUpdatedAt && remoteUpdatedAt !== write.baseUpdatedAt) {
      throw new ConflictError({
        collectionName: write.collectionName,
        docId: write.docId,
        local: write.data ?? {},
        remote,
      });
    }
  }

  if (write.operation === "delete") {
    await setDoc(target, sanitizeFirestoreData(softDeleteMetadata({
      tenantId: write.tenantId,
      branchId: write.branchId,
      restaurantId: typeof write.data?.restaurantId === "string" ? write.data.restaurantId : undefined,
    })), { merge: true });
    return;
  }

  const metadataInput = {
    tenantId: typeof (write.tenantId ?? write.data?.tenantId) === "string" ? (write.tenantId ?? write.data?.tenantId) as string : undefined,
    branchId: typeof (write.branchId ?? write.data?.branchId) === "string" ? (write.branchId ?? write.data?.branchId) as string : undefined,
    restaurantId: typeof write.data?.restaurantId === "string" ? write.data.restaurantId : undefined,
  };
  const payload = sanitizeFirestoreData({
    ...(write.operation === "set" ? createMetadata(metadataInput) : {}),
    ...(write.data ?? {}),
    tenantId: write.tenantId ?? write.data?.tenantId,
    branchId: write.branchId ?? write.data?.branchId,
    ...updateMetadata(metadataInput),
  });

  if (write.operation === "update") {
    await updateDoc(target, payload);
    return;
  }

  await setDoc(target, payload, { merge: write.merge ?? true });
}

function sanitizeFirestoreData(input: Record<string, unknown>) {
  return sanitizeFirestoreValue(input) as Record<string, unknown>;
}

function sanitizeFirestoreValue(value: unknown): unknown {
  if (value === undefined) return undefined;

  if (Array.isArray(value)) {
    return value
      .map(sanitizeFirestoreValue)
      .filter((item) => item !== undefined);
  }

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
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return null;
}

class ConflictError extends Error {
  conflict: NonNullable<OfflineQueueEntry["conflict"]>;

  constructor(conflict: NonNullable<OfflineQueueEntry["conflict"]>) {
    super("Offline sync conflict");
    this.conflict = conflict;
  }
}
