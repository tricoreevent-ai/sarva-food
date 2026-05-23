"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCcw, RotateCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getConnectivitySnapshot,
  offlineQueueManager,
  startOfflineSyncEngine,
  subscribeConnectivity,
  subscribeOfflineQueue,
  type ConnectivitySnapshot,
  type OfflineQueueEntry,
} from "@/lib/offline";

export function SyncCenter() {
  const [connectivity, setConnectivity] = useState<ConnectivitySnapshot>({
    online: true,
    lastChangedAt: "1970-01-01T00:00:00.000Z",
  });
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    startOfflineSyncEngine();
    const id = window.setTimeout(() => setConnectivity(getConnectivitySnapshot()), 0);
    const unsubscribeConnectivity = subscribeConnectivity(setConnectivity);
    const unsubscribeQueue = subscribeOfflineQueue((items) => {
      const obsolete = items.filter((item) => item.writes.some((write) => write.collectionName === "accountingTransactions"));
      if (obsolete.length) {
        void Promise.all(obsolete.map((item) => offlineQueueManager.discard(item)));
      }
      setQueue(items.filter((item) => !obsolete.some((oldItem) => oldItem.id === item.id)));
    });
    const openFromHeader = () => setOpen(true);
    window.addEventListener("sarva-open-sync-center", openFromHeader);

    return () => {
      window.clearTimeout(id);
      window.removeEventListener("sarva-open-sync-center", openFromHeader);
      unsubscribeConnectivity();
      unsubscribeQueue();
    };
  }, []);

  const counts = useMemo(() => {
    const pending = queue.filter((item) => item.status === "queued" || item.status === "retrying").length;
    const failed = queue.filter((item) => item.status === "failed").length;
    const conflicts = queue.filter((item) => item.status === "conflict").length;
    return { pending, failed, conflicts };
  }, [queue]);

  const visible = !connectivity.online || queue.length > 0;
  const label = !connectivity.online
    ? "Offline"
    : counts.conflicts
      ? `${counts.conflicts} conflicts`
      : counts.failed
        ? `${counts.failed} failed`
        : counts.pending
          ? `${counts.pending} pending`
          : "Synced";
  const tone = !connectivity.online || counts.failed || counts.conflicts
    ? "warning"
    : counts.pending
      ? "muted"
      : "success";

  if (!visible) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="fixed bottom-3 right-3 z-50">
        <SheetTrigger asChild>
          <Button type="button" variant="outline" className="h-11 rounded-full bg-card px-3 shadow-xl">
            {!connectivity.online ? <CloudOff className="size-4" /> : tone === "success" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
            Sync
            <Badge variant={tone}>{label}</Badge>
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent side="right" className="flex max-h-dvh flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>Sync center</SheetTitle>
          <SheetDescription>
            Offline POS, kitchen, inventory, billing, customer, loyalty, and table actions sync from this queue.
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-2">
          <Metric label="Pending" value={counts.pending} />
          <Metric label="Failed" value={counts.failed} />
          <Metric label="Conflicts" value={counts.conflicts} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={() => {
              toast.promise(offlineQueueManager.retryAll(), {
                loading: "Trying sync again...",
                success: "Sync retry started.",
                error: "Sync retry could not start.",
              });
            }}
            disabled={!connectivity.online || !queue.length}
          >
            <RefreshCcw className="size-4" />
            Retry sync
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const failed = queue.filter((item) => item.status === "failed");
              toast.promise(Promise.all(failed.map((item) => offlineQueueManager.discard(item))), {
                loading: "Clearing failed sync items...",
                success: "Old failed sync items cleared.",
                error: "Could not clear failed sync items.",
              });
            }}
            disabled={!counts.failed}
          >
            <Trash2 className="size-4" />
            Clear failed
          </Button>
        </div>

        <div className="customer-scroll -mx-1 flex-1 space-y-3 overflow-y-auto px-1 pb-8">
          {queue.length ? queue.map((entry) => <QueueRow key={entry.id} entry={entry} />) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm font-semibold text-muted-foreground">
              No pending sync activity.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function QueueRow({ entry }: { entry: OfflineQueueEntry }) {
  const statusVariant = entry.status === "failed" || entry.status === "conflict"
    ? "warning"
    : entry.status === "synced"
      ? "success"
      : "muted";

  return (
    <article className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant}>{entry.status}</Badge>
            <p className="text-xs font-black text-muted-foreground">{moduleLabel(entry.module)}</p>
          </div>
          <h3 className="mt-2 text-sm font-black">{entry.action}</h3>
          <div className="mt-2 grid gap-1 text-xs font-semibold text-muted-foreground">
            <p>Queued {formatSyncTime(entry.createdAt)}</p>
            {entry.lastAttemptAt ? <p>Last tried {formatSyncTime(entry.lastAttemptAt)}</p> : null}
            {entry.nextAttemptAt ? <p>Next retry {formatSyncTime(entry.nextAttemptAt)}</p> : null}
          </div>
          {entry.lastError ? <p className="mt-2 text-xs leading-5 text-warning">{friendlySyncError(entry.lastError)}</p> : null}
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            toast.promise(offlineQueueManager.discard(entry), {
              loading: "Removing sync item...",
              success: "Sync item removed.",
              error: "Could not remove sync item.",
            });
          }}
          aria-label="Discard sync item"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            toast.promise(offlineQueueManager.retry(entry), {
              loading: "Retrying this item...",
              success: "Sync retry started.",
              error: "Could not retry this item.",
            });
          }}
        >
          <RefreshCcw className="size-3" />
          Retry
        </Button>
        {entry.status === "conflict" ? (
          <>
            <Button type="button" size="sm" variant="secondary" onClick={() => void offlineQueueManager.resolveConflict(entry, "local")}>
              <RotateCcw className="size-3" />
              Use local
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void offlineQueueManager.resolveConflict(entry, "remote")}>
              Keep remote
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function moduleLabel(module: string) {
  if (module === "KDS" || module === "kitchen") return "Kitchen Queue";
  if (module === "POS") return "POS";
  return module.charAt(0).toUpperCase() + module.slice(1);
}

function formatSyncTime(value?: string) {
  if (!value) return "not yet";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function friendlySyncError(value: string) {
  if (value.toLowerCase().includes("permission")) {
    return "Permission was denied by Firestore. Check users/{uid}: active must be true, role must be owner/manager/cashier/waiter/chef, restaurantIds or tenantId must include this restaurant, and branchIds must include this branch.";
  }
  if (value.toLowerCase().includes("access setup required")) {
    return value;
  }
  return value;
}
