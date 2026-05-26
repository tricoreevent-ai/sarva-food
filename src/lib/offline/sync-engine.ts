import { shouldUseFirebase } from "@/lib/env";
import { isOnline, subscribeConnectivity } from "@/lib/offline/connectivity-monitor";
import { cleanupStaleOfflineCache } from "@/lib/offline/offline-storage";
import {
  deleteOfflineQueueEntry,
  getOfflineQueue,
  type OfflineQueueEntry,
  requestServiceWorkerSync,
  updateOfflineQueueEntry,
} from "@/lib/offline/offline-queue";
import { getNextRetryAt, shouldRetry } from "@/lib/offline/retry-manager";

let syncInFlight: Promise<void> | null = null;
let started = false;
let lastSyncAttemptAt = 0;
const BACKGROUND_SYNC_INTERVAL_MS = 60_000;
const MIN_SYNC_GAP_MS = 15_000;

function canSync() {
  return (
    typeof window !== "undefined" &&
    isOnline() &&
    shouldUseFirebase()
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
    await syncEntryThroughBackend(entry, options.forceConflicts ?? false);

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

async function syncEntryThroughBackend(entry: OfflineQueueEntry, forceConflict: boolean) {
  const response = await fetch("/api/owner/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      entryId: entry.id,
      writes: entry.writes,
      forceConflict,
    }),
  });
  const data = await response.json().catch(() => ({})) as {
    error?: string;
    conflict?: NonNullable<OfflineQueueEntry["conflict"]>;
  };

  if (response.status === 409 && data.conflict) {
    throw new ConflictError(data.conflict);
  }

  if (!response.ok) {
    throw new Error(data.error ?? "Owner sync failed.");
  }
}

class ConflictError extends Error {
  conflict: NonNullable<OfflineQueueEntry["conflict"]>;

  constructor(conflict: NonNullable<OfflineQueueEntry["conflict"]>) {
    super("Offline sync conflict");
    this.conflict = conflict;
  }
}
