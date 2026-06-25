"use client";

import { useState } from "react";
import { Eye, LockKeyhole } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationalViewLabel, operationalViews, type OperationalView } from "@/lib/operational-access";
import { useOperationalView } from "@/hooks/use-operational-view";

export function OperationalViewSwitcher() {
  const { session, loading } = useOperationalView();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<OperationalView>("owner");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading || !session) return null;
  if (session.role !== "owner") {
    return <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 md:inline-flex">{operationalViewLabel(session.viewMode)}</span>;
  }

  async function switchView() {
    setSaving(true);
    const response = await fetch("/api/owner/view-mode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ viewMode, password }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setSaving(false);
    if (!response.ok) return toast.error(payload.error || "Unable to switch view.");
    setPassword("");
    setOpen(false);
    window.dispatchEvent(new CustomEvent("sarva-view-mode"));
    toast.success(`${operationalViewLabel(viewMode)} active.`);
  }

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => { setViewMode(session.viewMode); setOpen((value) => !value); }}>
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
            <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
            <Input type="password" className="pl-10" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Owner password" />
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
