"use client";

import { useEffect, useState, type ReactNode } from "react";

type IdleWindow = Window & {
  requestIdleCallback?: (handler: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function IdleMount({
  children,
  timeoutMs = 1600,
}: {
  children: ReactNode;
  timeoutMs?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const win = window as IdleWindow;
    if (typeof win.requestIdleCallback === "function") {
      const id = win.requestIdleCallback(() => setReady(true), { timeout: timeoutMs });
      return () => win.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), timeoutMs);
    return () => window.clearTimeout(id);
  }, [ready, timeoutMs]);

  return ready ? children : null;
}
