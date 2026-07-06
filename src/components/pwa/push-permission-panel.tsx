"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hasPushSupport,
  removeRegisteredPushToken,
  requestPushPermission,
  type PushRegistrationState,
  type PushSurface,
} from "@/services/fcm-client";

export function PushPermissionPanel({ surface = "owner" }: { surface?: PushSurface }) {
  const [state, setState] = useState<PushRegistrationState>(() => ({ status: "default" }));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const sync = () => {
      if (!active) return;
      setState(!hasPushSupport()
        ? { status: "unsupported" }
        : { status: Notification.permission === "granted" ? "enabled" : Notification.permission });
    };
    queueMicrotask(sync);
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setState(await requestPushPermission(surface));
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    await removeRegisteredPushToken(surface);
    setState({ status: Notification.permission === "granted" ? "default" : Notification.permission });
    setBusy(false);
  }

  const enabled = state.status === "enabled";
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            {enabled ? <ShieldCheck className="size-5" /> : <BellRing className="size-5" />}
          </span>
          <div>
            <p className="font-black text-slate-950">Browser push</p>
            <p className="text-xs font-semibold text-slate-500">{statusLabel(state.status)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {enabled ? (
            <Button size="sm" variant="outline" onClick={() => void disable()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              Disable
            </Button>
          ) : (
            <Button size="sm" onClick={() => void enable()} disabled={busy || state.status === "unsupported" || state.status === "missing-key"}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
              Enable
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: PushRegistrationState["status"]) {
  if (status === "enabled") return "Enabled on this device.";
  if (status === "denied") return "Blocked in browser settings.";
  if (status === "missing-key") return "Firebase VAPID key required.";
  if (status === "unsupported") return "Unsupported by this browser.";
  if (status === "failed") return "Could not enable push.";
  return "Not enabled on this device.";
}
