"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Clipboard, History, Loader2, RefreshCcw, Send, Smartphone, Trash2, Volume2 } from "lucide-react";
import { toast } from "@/lib/client-toast";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { Button } from "@/components/ui/button";
import { playOperationalSound } from "@/lib/operational-sounds";
import {
  dispatchBackgroundPushTest,
  dispatchForegroundPushTest,
  forceRefreshPushToken,
  getPushDeviceDiagnostics,
  registerCurrentPushToken,
  removeRegisteredPushToken,
} from "@/services/fcm-client";

type HistoryItem = { id: string; action: string; status: "pass" | "fail" | "manual"; detail: string; at: string };
type Diagnostics = ReturnType<typeof getPushDeviceDiagnostics>;
const historyKey = "sarva-notification-test-history:v1";

export function NotificationTestCenter() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics>(() => getPushDeviceDiagnostics());
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [busy, setBusy] = useState("");

  const refresh = useCallback(() => setDiagnostics(getPushDeviceDiagnostics()), []);
  const record = useCallback((action: string, status: HistoryItem["status"], detail: string) => {
    setHistory((current) => [{ id: crypto.randomUUID(), action, status, detail, at: new Date().toISOString() }, ...current].slice(0, 40));
  }, []);

  useEffect(() => {
    const observed = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string }>).detail;
      record("Foreground delivery", "pass", detail?.title || "Notification received");
    };
    const workerMessage = (event: MessageEvent) => {
      if (event.data?.type === "SARVA_PUSH_RECEIVED") record("Background delivery", "pass", `${event.data.source || "push"} notification displayed`);
      if (event.data?.type === "SARVA_PUSH_CLICK") record("Notification opened", "pass", event.data.action || "deep link opened");
    };
    window.addEventListener("sarva:push-observed", observed);
    navigator.serviceWorker?.addEventListener("message", workerMessage);
    return () => {
      window.removeEventListener("sarva:push-observed", observed);
      navigator.serviceWorker?.removeEventListener("message", workerMessage);
    };
  }, [record, refresh]);

  useEffect(() => {
    localStorage.setItem(historyKey, JSON.stringify(history));
  }, [history]);

  const run = useCallback(async (action: string, task: () => Promise<string>) => {
    setBusy(action);
    try {
      const detail = await task();
      record(action, "pass", detail);
      toast.success(detail);
    } catch (error) {
      const detail = error instanceof Error ? error.message : `${action} failed.`;
      record(action, "fail", detail);
      toast.error(detail);
    } finally {
      refresh();
      setBusy("");
    }
  }, [record, refresh]);

  const status = useMemo(() => [
    ["Browser Support", diagnostics?.supported ? "Supported" : "Unavailable"],
    ["Permission", diagnostics?.permission || "Unknown"],
    ["Service Worker", diagnostics?.serviceWorker || "Unknown"],
    ["Firebase Registration", diagnostics?.firebaseRegistration || "Unknown"],
    ["VAPID", diagnostics?.vapidConfigured ? "Configured" : "Missing"],
    ["Registered Devices", String(diagnostics?.deviceCount || 0)],
  ], [diagnostics]);
  const lastDelivery = history.find((item) => /delivery/i.test(item.action));
  const lastOpened = history.find((item) => /opened/i.test(item.action));

  return (
    <DashboardCard title="Notification Test Center">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {status.map(([label, value]) => <Status key={label} label={label} value={value} />)}
        </div>
        <div className="rounded-md border border-input bg-muted/20 p-3 text-sm">
          <p className="font-bold text-foreground">Current Device Token</p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{maskToken(diagnostics?.token) || "No token registered"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Last delivery: {formatEvent(lastDelivery)} · Last opened: {formatEvent(lastOpened)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Action label="Register Device" icon={Smartphone} busy={busy} onClick={() => run("Register Device", async () => {
            const result = await registerCurrentPushToken("owner");
            if (result.status !== "enabled") throw new Error(`Registration status: ${result.status}`);
            return `Device registered (${result.deviceCount || 1} active).`;
          })} />
          <Action label="Refresh Token" icon={RefreshCcw} busy={busy} onClick={() => run("Refresh Token", async () => {
            const result = await forceRefreshPushToken("owner");
            if (result.status !== "enabled") throw new Error(`Refresh status: ${result.status}`);
            return "Device token refreshed.";
          })} />
          <Action label="Copy Token" icon={Clipboard} busy={busy} onClick={() => run("Copy Token", async () => {
            if (!diagnostics?.token) throw new Error("Register this device first.");
            await navigator.clipboard.writeText(diagnostics.token);
            return "Device token copied.";
          })} />
          <Action label="Remove Device" icon={Trash2} busy={busy} onClick={() => run("Remove Device", async () => {
            await removeRegisteredPushToken("owner", false);
            return "Server device registration removed.";
          })} />
          <Action label="Delete Token" icon={Trash2} busy={busy} onClick={() => run("Delete Token", async () => {
            await removeRegisteredPushToken("owner", true);
            return "Firebase token deleted.";
          })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Action label="Browser Notification" icon={BellRing} busy={busy} onClick={() => run("Browser Notification", async () => {
            if (!("Notification" in window) || Notification.permission !== "granted") throw new Error("Grant notification permission first.");
            new Notification("Browser notification test", { body: "Native browser notification display is available.", icon: "/android-chrome-192x192.png" });
            return "Native browser notification displayed.";
          })} />
          <Action label="Send Test Notification" icon={Send} busy={busy} onClick={() => run("Push Notification", async () => {
            const response = await fetch("/api/owner/notification-test", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
            const payload = await response.json().catch(() => ({})) as { error?: string; successCount?: number };
            if (!response.ok) throw new Error(payload.error || "Push test failed.");
            return `Firebase accepted ${payload.successCount || 0} delivery target(s).`;
          })} />
          <Action label="Foreground Notification" icon={BellRing} busy={busy} onClick={() => run("Foreground Notification", async () => {
            dispatchForegroundPushTest();
            return "Foreground notification dispatched.";
          })} />
          <Action label="Background Notification" icon={BellRing} busy={busy} onClick={() => run("Background Notification", async () => {
            await dispatchBackgroundPushTest();
            return "Background notification requested.";
          })} />
          <Action label="Action Buttons" icon={BellRing} busy={busy} onClick={() => run("Action Buttons", async () => {
            await dispatchBackgroundPushTest(true);
            return "Action notification requested; click an action to complete the manual interaction check.";
          })} />
          <Action label="Deep Link" icon={BellRing} busy={busy} onClick={() => run("Deep Link", async () => {
            await dispatchBackgroundPushTest(true);
            return "Open Settings verifies the same-origin notification deep link.";
          })} />
          <Action label="Badge" icon={BellRing} busy={busy} onClick={() => run("Badge", async () => {
            const nav = navigator as Navigator & { setAppBadge?: (count?: number) => Promise<void> };
            if (!nav.setAppBadge) throw new Error("App badges are unsupported in this browser.");
            await nav.setAppBadge(1);
            return "App badge set to 1.";
          })} />
          <Action label="Sound" icon={Volume2} busy={busy} onClick={() => run("Sound", async () => {
            await playOperationalSound({ sound: "bell", volume: 0.65, repeatCount: 1 });
            return "Notification sound played.";
          })} />
        </div>
        <div className="rounded-md border border-input">
          <div className="flex items-center justify-between gap-3 border-b border-input p-3">
            <p className="flex items-center gap-2 font-bold"><History className="size-4" />Notification History</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setHistory([])}>Clear History</Button>
          </div>
          <div className="max-h-64 divide-y divide-input overflow-auto" aria-live="polite">
            {history.length ? history.map((item) => (
              <div key={item.id} className="grid gap-1 p-3 text-xs sm:grid-cols-[160px_70px_1fr]">
                <span className="font-bold text-foreground">{item.action}</span>
                <span className={item.status === "pass" ? "text-emerald-700" : item.status === "fail" ? "text-red-700" : "text-amber-700"}>{item.status.toUpperCase()}</span>
                <span className="text-muted-foreground">{item.detail} · {new Date(item.at).toLocaleString()}</span>
              </div>
            )) : <p className="p-4 text-sm text-muted-foreground">No notification tests recorded.</p>}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function Action({ label, icon: Icon, busy, onClick }: { label: string; icon: typeof Send; busy: string; onClick: () => void }) {
  return <Button type="button" variant="outline" disabled={Boolean(busy)} onClick={onClick}>{busy === label ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}{label}</Button>;
}

function Status({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-input p-3"><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 font-bold text-foreground">{value}</p></div>;
}

function maskToken(token?: string) {
  if (!token) return "";
  return token.length > 28 ? `${token.slice(0, 14)}...${token.slice(-10)}` : token;
}

function formatEvent(item?: HistoryItem) {
  return item ? new Date(item.at).toLocaleString() : "None";
}

function loadHistory() {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) || "[]") as HistoryItem[];
    return Array.isArray(saved) ? saved.slice(0, 40) : [];
  } catch {
    return [];
  }
}
