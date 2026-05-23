"use client";

import { AlertTriangle, CheckCircle2, CloudOff, RefreshCcw, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteOfflineQueueEntry,
  getConnectivitySnapshot,
  startOfflineSyncEngine,
  subscribeConnectivity,
  subscribeOfflineQueue,
  syncQueuedOperations,
  updateOfflineQueueEntry,
  type ConnectivitySnapshot,
  type OfflineQueueEntry,
} from "@/lib/offline";

export function SyncStatusIndicator() {
  const [connectivity, setConnectivity] = useState<ConnectivitySnapshot>({
    online: true,
    lastChangedAt: new Date(0).toISOString(),
  });
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    const initialConnectivityTimer = window.setTimeout(() => {
      setConnectivity(getConnectivitySnapshot());
    }, 0);
    startOfflineSyncEngine();
    const unsubscribeConnectivity = subscribeConnectivity(setConnectivity);
    const unsubscribeQueue = subscribeOfflineQueue((items) => {
      setQueue((previous) => {
        if (previous.some((item) => item.status !== "synced") && !items.some((item) => item.status !== "synced")) {
          setLastSyncedAt(new Date().toISOString());
        }
        return items;
      });
    });

    return () => {
      window.clearTimeout(initialConnectivityTimer);
      unsubscribeConnectivity();
      unsubscribeQueue();
    };
  }, []);

  const pending = queue.filter((item) => ["queued", "retrying"].includes(item.status));
  const failed = queue.filter((item) => item.status === "failed");
  const conflicts = queue.filter((item) => item.status === "conflict");
  const visible = !connectivity.online || pending.length > 0 || failed.length > 0 || conflicts.length > 0 || lastSyncedAt;
  const summary = useMemo(() => {
    if (!connectivity.online) return "Offline";
    if (conflicts.length) return `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"}`;
    if (failed.length) return `${failed.length} failed`;
    if (pending.length) return `${pending.length} pending`;
    return "Synced";
  }, [conflicts.length, connectivity.online, failed.length, pending.length]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 right-3 z-50 w-[min(92vw,360px)] rounded-lg border bg-card p-3 text-card-foreground shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
            {!connectivity.online ? <CloudOff className="size-4" /> : conflicts.length || failed.length ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black">Sync status</p>
              <Badge variant={!connectivity.online || failed.length || conflicts.length ? "warning" : pending.length ? "muted" : "success"}>
                {summary}
              </Badge>
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : "Waiting for first sync"}
            </p>
          </div>
        </div>
        <Button type="button" size="icon-sm" variant="outline" onClick={() => void syncQueuedOperations()}>
          <RefreshCcw className="size-3" />
        </Button>
      </div>

      {conflicts.length ? (
        <div className="mt-3 space-y-2 rounded-md border bg-muted/40 p-2">
          <p className="text-xs font-black text-warning">Conflict resolution</p>
          {conflicts.slice(0, 3).map((item) => (
            <div key={item.id} className="grid gap-2 rounded-md bg-card p-2 text-xs">
              <p className="font-semibold">
                {item.module}: {item.action}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await updateOfflineQueueEntry(item.id, { status: "queued", nextAttemptAt: undefined });
                    await syncQueuedOperations({ forceConflicts: true });
                  }}
                >
                  <RotateCcw className="size-3" />
                  Use local
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void deleteOfflineQueueEntry(item.id)}>
                  Keep remote
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
