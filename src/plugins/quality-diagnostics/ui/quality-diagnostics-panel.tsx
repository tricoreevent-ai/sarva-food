"use client";

import { cn } from "@/lib/utils";
import type { QualityDiagnosticsSnapshot } from "../types";

export function QualityDiagnosticsPanel({
  snapshot,
}: {
  snapshot: QualityDiagnosticsSnapshot | null;
}) {
  if (!snapshot || process.env.NODE_ENV === "production") return null;

  return (
    <output
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-3 right-3 z-[60] flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs text-foreground shadow-sm backdrop-blur",
        snapshot.rating === "critical" && "border-destructive text-destructive",
        snapshot.rating === "watch" && "border-warning text-warning",
      )}
    >
      <span>{snapshot.rating}</span>
      <span>{snapshot.worstLongTaskMs}ms</span>
      {snapshot.usedHeapMb ? <span>{snapshot.usedHeapMb}MB</span> : null}
    </output>
  );
}
