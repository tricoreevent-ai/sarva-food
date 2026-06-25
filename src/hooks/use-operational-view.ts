"use client";

import { useCallback, useEffect, useState } from "react";
import type { OperationalView } from "@/lib/operational-access";
import type { UserRole } from "@/types/firebase";

type OperationalSession = {
  viewMode: OperationalView;
  role: UserRole;
  permissions: string[];
};

export function useOperationalView(enabled = true) {
  const [session, setSession] = useState<OperationalSession | null>(null);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const response = await fetch("/api/owner/view-mode", { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as { data?: OperationalSession };
    setSession(response.ok ? payload.data ?? null : null);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    const listener = () => void refresh();
    window.addEventListener("sarva-view-mode", listener);
    return () => window.removeEventListener("sarva-view-mode", listener);
  }, [refresh]);

  return { session, loading, refresh };
}
