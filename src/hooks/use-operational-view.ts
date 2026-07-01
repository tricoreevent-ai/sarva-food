"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OperationalView } from "@/lib/operational-access";
import type { UserRole } from "@/types/firebase";

type OperationalSession = {
  viewMode: OperationalView;
  role: UserRole;
  permissions: string[];
};

let cachedSession: OperationalSession | null = null;
let inflight: Promise<OperationalSession | null> | null = null;
let controller: AbortController | null = null;
const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((listener) => listener());
}

async function fetchSession(force = false) {
  if (!force && cachedSession) return cachedSession;
  if (inflight) return inflight;
  controller?.abort();
  controller = new AbortController();
  const timeout = window.setTimeout(() => controller?.abort(), 8000);
  inflight = fetch("/api/owner/view-mode", { cache: "no-store", signal: controller.signal })
    .then((response) => response.json().then((payload: { data?: OperationalSession }) => (response.ok ? payload.data ?? null : null)))
    .catch(() => null)
    .then((session) => {
      cachedSession = session;
      emit();
      return session;
    })
    .finally(() => {
      window.clearTimeout(timeout);
      inflight = null;
      controller = null;
    });
  return inflight;
}

export function useOperationalView(enabled = true) {
  const [session, setSession] = useState<OperationalSession | null>(cachedSession);
  const [loading, setLoading] = useState(enabled && !cachedSession);
  const mounted = useRef(true);

  const refresh = useCallback(async (force = false) => {
    if (!enabled) return null;
    setLoading(true);
    const next = await fetchSession(force);
    if (!mounted.current) return next;
    setSession(next);
    setLoading(false);
    return next;
  }, [enabled]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const listener = () => {
      setSession(cachedSession);
      setLoading(false);
    };
    subscribers.add(listener);
    queueMicrotask(() => void refresh());
    window.addEventListener("sarva-view-mode", listener);
    return () => {
      subscribers.delete(listener);
      window.removeEventListener("sarva-view-mode", listener);
    };
  }, [enabled, refresh]);

  return { session, loading, refresh };
}
