"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, LockKeyhole, RotateCcw, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationalViewLabel, operationalViews, type OperationalView } from "@/lib/operational-access";
import { useOperationalView } from "@/hooks/use-operational-view";

export function OperationalViewSwitcher() {
  const router = useRouter();
  const { session, loading, refresh } = useOperationalView();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<OperationalView>("owner");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!saving) return undefined;
    const slowTimer = window.setTimeout(() => setSlow(true), 3000);
    const retryTimer = window.setTimeout(() => {
      abortRef.current?.abort();
      setRetry(true);
      setSaving(false);
    }, 10000);
    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(retryTimer);
    };
  }, [saving]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  if (loading || !session) return null;
  if (session.role !== "owner") {
    return <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 md:inline-flex">{operationalViewLabel(session.viewMode)}</span>;
  }

  async function switchView() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSaving(true);
    setSlow(false);
    setRetry(false);
    try {
      const response = await fetch("/api/owner/view-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewMode, password }),
        signal: abortRef.current.signal,
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to switch view.");
      setPassword("");
      setOpen(false);
      await refresh(true);
      router.replace(routeForView(viewMode));
      toast.success(`${operationalViewLabel(viewMode)} active.`);
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.error(error instanceof Error ? error.message : "Unable to switch view.");
    } finally {
      setSaving(false);
    }
  }

  function cancelSwitch() {
    abortRef.current?.abort();
    setSaving(false);
    setSlow(false);
    setRetry(false);
  }

  return (
    <div className="relative">
      {saving || retry ? <SwitchOverlay viewMode={viewMode} slow={slow} retry={retry} onRetry={() => void switchView()} onCancel={cancelSwitch} /> : null}
      <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => { setViewMode(session.viewMode); setOpen((value) => !value); }}>
        <Eye className="size-4" />
        <span className="hidden md:inline">{operationalViewLabel(session.viewMode)}</span>
      </Button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-72 space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-2xl">
          <p className="font-black text-slate-950">Switch operational view</p>
          <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold" value={viewMode} onChange={(event) => setViewMode(event.target.value as OperationalView)}>
            {operationalViews.map((view) => <option key={view} value={view}>{operationalViewLabel(view)}</option>)}
          </select>
          <div className="relative">
            <span className="pointer-events-none absolute size-0 overflow-hidden opacity-0" aria-hidden="true">
              <input tabIndex={-1} type="text" name="owner-view-switch-username" autoComplete="username" />
              <input tabIndex={-1} type="password" name="owner-view-switch-password-decoy" autoComplete="current-password" />
            </span>
            <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
            <Input
              id="owner-view-switch-password"
              name="ownerViewSwitchPassword"
              type="password"
              autoComplete="current-password"
              className="pl-10"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Owner password"
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={saving || !password} onClick={() => void switchView()}>{saving ? "Switching..." : "Switch"}</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SwitchOverlay({
  viewMode,
  slow,
  retry,
  onRetry,
  onCancel,
}: {
  viewMode: OperationalView;
  slow: boolean;
  retry: boolean;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" aria-live="polite" aria-busy={!retry}>
      <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white p-5 text-center shadow-2xl">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-orange-50 text-orange-600">
          {retry ? <X className="size-6" /> : <Loader2 className="size-6 animate-spin" />}
        </span>
        <h2 className="mt-4 text-lg font-black text-slate-950">
          {retry ? "Still loading..." : `Loading ${operationalViewLabel(viewMode)}...`}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {retry ? "The workspace did not finish loading. Retry or cancel and keep the current view." : slow ? "Still loading..." : "Switching workspace and permissions."}
        </p>
        {retry ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button type="button" onClick={onRetry}><RotateCcw className="size-4" />Retry</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function routeForView(view: OperationalView) {
  if (view === "kitchen") return "/owner/kitchen";
  if (view === "cashier" || view === "waiter") return "/owner/pos";
  return "/owner";
}
