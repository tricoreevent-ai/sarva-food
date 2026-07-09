import { memo } from "react";
import { badgeToneClass } from "./OrderAccordion.utils";
import type { OrderAccordionBadge } from "./OrderAccordion.types";

export const OrderPriorityBadge = memo(function OrderPriorityBadge({ badge }: { badge: OrderAccordionBadge }) {
  return (
    <span className={`inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black ${badgeToneClass(badge.tone)}`}>
      {badge.icon}
      {badge.label}
    </span>
  );
});
