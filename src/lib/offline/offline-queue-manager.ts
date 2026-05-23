import {
  deleteOfflineQueueEntry,
  enqueueOfflineOperation,
  getOfflineQueue,
  updateOfflineQueueEntry,
  type OfflineQueueEntry,
  type OfflineWrite,
  type OfflineModule,
} from "@/lib/offline/offline-queue";
import { syncQueuedOperations } from "@/lib/offline/sync-engine";

export class OfflineQueueManager {
  async enqueue(input: {
    module: OfflineModule;
    action: string;
    writes: OfflineWrite[];
    id?: string;
  }) {
    return enqueueOfflineOperation(input);
  }

  list() {
    return getOfflineQueue();
  }

  retry(entry: OfflineQueueEntry) {
    return updateOfflineQueueEntry(entry.id, {
      status: "queued",
      nextAttemptAt: undefined,
      lastError: undefined,
    }).then(() => syncQueuedOperations({ forceConflicts: true }));
  }

  async retryAll() {
    const entries = await getOfflineQueue();
    await Promise.all(
      entries
        .filter((entry) => entry.status !== "synced" && entry.status !== "conflict")
        .map((entry) =>
          updateOfflineQueueEntry(entry.id, {
            status: "queued",
            nextAttemptAt: undefined,
            lastError: undefined,
          }),
        ),
    );
    return syncQueuedOperations({ forceConflicts: true });
  }

  resolveConflict(entry: OfflineQueueEntry, strategy: "local" | "remote") {
    if (strategy === "remote") {
      return deleteOfflineQueueEntry(entry.id);
    }

    return updateOfflineQueueEntry(entry.id, {
      status: "queued",
      nextAttemptAt: undefined,
      lastError: undefined,
      conflict: undefined,
    }).then(() => syncQueuedOperations({ forceConflicts: true }));
  }

  discard(entry: OfflineQueueEntry) {
    return deleteOfflineQueueEntry(entry.id);
  }
}

export const offlineQueueManager = new OfflineQueueManager();
