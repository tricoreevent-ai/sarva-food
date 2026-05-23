"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CacheState = {
  version?: string;
  caches: string[];
};

export function SwDebugPanel() {
  const [state, setState] = useState<CacheState>({ caches: [] });
  const [busy, setBusy] = useState(false);
  const serviceWorkerAvailable = typeof navigator !== "undefined" && "serviceWorker" in navigator;

  const refreshState = useCallback(async () => {
    if (!serviceWorkerAvailable) return;
    navigator.serviceWorker.controller?.postMessage({ type: "SARVA_GET_CACHE_STATE" });
    if ("caches" in window) {
      const keys = await caches.keys().catch(() => []);
      setState((current) => ({
        ...current,
        caches: keys.filter((key) => key.startsWith("sarva-")),
      }));
    }
  }, [serviceWorkerAvailable]);

  useEffect(() => {
    if (!serviceWorkerAvailable) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SARVA_CACHE_STATE") {
        setState({
          version: event.data.version,
          caches: Array.isArray(event.data.caches) ? event.data.caches : [],
        });
      }
      if (event.data?.type === "SARVA_CACHES_CLEARED") {
        void refreshState();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    const timerId = window.setTimeout(() => void refreshState(), 0);
    return () => {
      window.clearTimeout(timerId);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [refreshState, serviceWorkerAvailable]);

  async function clearCaches() {
    setBusy(true);
    try {
      navigator.serviceWorker?.controller?.postMessage({ type: "SARVA_CLEAR_CACHES" });
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("sarva-")).map((key) => caches.delete(key)));
      }
      await refreshState();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black">App cache</p>
          <p className="mt-1 text-muted-foreground">
            {state.version ? `SW ${state.version}` : serviceWorkerAvailable ? "Service worker ready" : "Service worker unavailable"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="icon-sm" variant="outline" onClick={() => void refreshState()} aria-label="Refresh cache status">
            <RefreshCw className="size-4" />
          </Button>
          <Button type="button" size="icon-sm" variant="destructive" onClick={() => void clearCaches()} disabled={busy} aria-label="Clear app cache">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {state.caches.length ? (
        <p className="mt-2 break-words text-xs font-semibold text-muted-foreground">{state.caches.join(", ")}</p>
      ) : null}
    </div>
  );
}
