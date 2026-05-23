import {
  deleteOfflineRecord,
  getAllOfflineRecords,
  getOfflineRecord,
  putOfflineRecord,
} from "@/lib/offline/offline-storage";

export type OfflineModule =
  | "POS"
  | "kitchen"
  | "billing"
  | "orders"
  | "inventory"
  | "customers"
  | "loyalty"
  | "reports"
  | "accounting";

export type OfflineWrite = {
  collectionName: string;
  docId?: string;
  operation: "set" | "update" | "delete";
  data?: Record<string, unknown>;
  merge?: boolean;
  tenantId?: string;
  branchId?: string;
  conflictKey?: string;
  baseUpdatedAt?: string;
};

export type OfflineQueueStatus = "queued" | "retrying" | "failed" | "conflict" | "synced";

export type OfflineQueueEntry = {
  id: string;
  module: OfflineModule;
  action: string;
  status: OfflineQueueStatus;
  writes: OfflineWrite[];
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  lastError?: string;
  syncedAt?: string;
  conflict?: {
    collectionName: string;
    docId: string;
    local: Record<string, unknown>;
    remote: Record<string, unknown>;
  };
};

type QueueListener = (items: OfflineQueueEntry[]) => void;

const listeners = new Set<QueueListener>();

function createId(prefix = "offline") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function emitQueue() {
  const items = await getOfflineQueue();
  listeners.forEach((listener) => listener(items));
}

export async function enqueueOfflineOperation(input: {
  module: OfflineModule;
  action: string;
  writes: OfflineWrite[];
  id?: string;
}) {
  const now = new Date().toISOString();
  const entry: OfflineQueueEntry = {
    id: input.id ?? createId(),
    module: input.module,
    action: input.action,
    status: "queued",
    writes: sanitizeOfflineWrites(input.writes),
    createdAt: now,
    updatedAt: now,
    attempts: 0,
  };

  await putOfflineRecord("queue", entry);
  await emitQueue();
  await requestServiceWorkerSync();
  return entry;
}

function sanitizeOfflineWrites(writes: OfflineWrite[]) {
  return writes.map((write) => ({
    ...write,
    data: write.data ? sanitizeOfflineValue(write.data) as Record<string, unknown> : undefined,
    tenantId: write.tenantId || undefined,
    branchId: write.branchId || undefined,
  }));
}

function sanitizeOfflineValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map(sanitizeOfflineValue).filter((entry) => entry !== undefined);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, sanitizeOfflineValue(entry)] as const)
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

export async function getOfflineQueue() {
  const rows = await getAllOfflineRecords<OfflineQueueEntry>("queue");
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getOfflineQueueEntry(id: string) {
  return getOfflineRecord<OfflineQueueEntry>("queue", id);
}

export async function updateOfflineQueueEntry(
  id: string,
  update: Partial<OfflineQueueEntry>,
) {
  const existing = await getOfflineQueueEntry(id);
  if (!existing) return null;
  const next = {
    ...existing,
    ...update,
    updatedAt: new Date().toISOString(),
  };
  await putOfflineRecord("queue", next);
  await emitQueue();
  return next;
}

export async function deleteOfflineQueueEntry(id: string) {
  await deleteOfflineRecord("queue", id);
  await emitQueue();
}

export function subscribeOfflineQueue(listener: QueueListener) {
  listeners.add(listener);
  void getOfflineQueue().then(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function requestServiceWorkerSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const syncRegistration = registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    await syncRegistration.sync?.register("sarva-sync-queue");
  } catch {
    // Background Sync is not available in every browser; the foreground sync
    // engine also runs on reconnect and interval.
  }
}
