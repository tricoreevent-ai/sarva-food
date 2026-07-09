import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import type { OrderAccordionDelay } from "./OrderAccordion.types";

export const OrderDelayIndicator = memo(function OrderDelayIndicator({ delay }: { delay: OrderAccordionDelay }) {
  if (!delay.delayed) return null;
  return (
    <div className="order-accordion-delay-indicator flex min-h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700" role="status" aria-live="polite">
      <AlertTriangle className="order-accordion-warning-icon size-4 shrink-0" />
      <span>{delay.label ?? "Delayed"}</span>
      {typeof delay.lateMinutes === "number" ? <span>{delay.lateMinutes}m over ETA</span> : null}
      {delay.waitingLabel ? <span>Waiting {delay.waitingLabel}</span> : null}
    </div>
  );
});
