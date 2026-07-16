import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderAccordionDelay } from "./OrderAccordion.types";
import { formatDelayTime } from "@/lib/kitchen-delay";

export const OrderDelayIndicator = memo(function OrderDelayIndicator({ delay }: { delay: OrderAccordionDelay }) {
  if (!delay.delayed) return null;
  const formatted = formatDelayTime(delay.lateMinutes ?? 0);
  return (
    <div className={cn(
      "order-accordion-delay-indicator flex min-h-9 flex-wrap items-center gap-2 rounded-lg border px-3 text-xs font-black",
      delay.level === "yellow" && "border-amber-200 bg-amber-50 text-amber-700",
      delay.level === "orange" && "border-orange-200 bg-orange-50 text-orange-700",
      (delay.level === "red" || delay.level === "critical") && "border-red-200 bg-red-50 text-red-700",
    )} role="status" aria-live="polite">
      <AlertTriangle className="order-accordion-warning-icon size-4 shrink-0" />
      <span>{formatted.severity === "stale" ? "Stale" : delay.label ?? "Delayed"}</span>
      {typeof delay.lateMinutes === "number" ? <span>{formatted.label}</span> : null}
      {delay.waitingLabel ? <span>Waiting {delay.waitingLabel}</span> : null}
    </div>
  );
});
