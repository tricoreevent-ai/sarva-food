import { memo } from "react";
import { cn } from "@/lib/utils";
import { badgeToneClass } from "./OrderAccordion.utils";
import type { OrderBadgeTone } from "./OrderAccordion.types";

export const OperationalOrderStatusBadge = memo(function OperationalOrderStatusBadge({
  status,
  label,
  tone,
  compact = false,
  className,
}: {
  status: string;
  label?: string;
  tone?: OrderBadgeTone;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border font-black uppercase",
      compact ? "min-h-4 px-1.5 py-0.5 text-[8px]" : "min-h-6 px-2 py-0.5 text-[11px]",
      operationalStatusClass(status, tone),
      className,
    )}>
      {label ?? status}
    </span>
  );
});

function operationalStatusClass(status: string, tone?: OrderBadgeTone) {
  const key = status.trim().toLowerCase().replaceAll("_", " ");
  if (key === "accepted") return "border-blue-100 bg-blue-50 text-blue-700";
  if (key === "preparing" || key === "in kitchen") return "border-orange-100 bg-orange-50 text-orange-700";
  if (key === "ready" || key === "ready to serve" || key === "paid") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (key === "picked-up" || key === "picked up") return "border-cyan-100 bg-cyan-50 text-cyan-700";
  if (key === "served") return "border-violet-100 bg-violet-50 text-violet-700";
  if (["completed", "delivered", "billed"].includes(key)) return "border-slate-200 bg-slate-100 text-slate-700";
  if (["critical", "cancelled", "rejected"].includes(key)) return "border-red-100 bg-red-50 text-red-700";
  if (["new", "occupied", "order taken", "with waiter"].includes(key)) return "border-blue-100 bg-blue-50 text-blue-700";
  return badgeToneClass(tone);
}
