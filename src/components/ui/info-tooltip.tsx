"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function InfoTooltip({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        title={label}
        className="grid size-7 place-items-center rounded-full border bg-white text-muted-foreground shadow-sm transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-9 z-50 hidden w-64 rounded-lg border bg-popover p-3 text-xs font-semibold leading-5 text-popover-foreground shadow-xl group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  );
}
