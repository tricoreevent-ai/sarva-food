import { memo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderPriorityBadge } from "./OrderPriorityBadge";
import type { CompactOrderAccordionProps } from "./OrderAccordion.types";

type Props = Pick<CompactOrderAccordionProps, "orderNumber" | "etaLabel" | "orderTypeLabel" | "tableLabel" | "itemCountLabel" | "status" | "priority" | "badges" | "isOpen" | "onOpenChange">;

export const CompactOrderAccordionHeader = memo(function CompactOrderAccordionHeader({
  orderNumber,
  etaLabel,
  orderTypeLabel,
  tableLabel,
  itemCountLabel,
  status,
  priority,
  badges = [],
  isOpen,
  onOpenChange,
}: Props) {
  return (
    <button
      type="button"
      className="grid min-h-[76px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left"
      onClick={() => onOpenChange(!isOpen)}
      aria-expanded={isOpen}
    >
      <span className="min-w-0">
        <span className="block truncate text-2xl font-black leading-tight text-slate-950">{orderNumber}</span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700">{etaLabel}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-700">{orderTypeLabel}</span>
          {tableLabel ? <span className="truncate text-xs font-black text-slate-600">{tableLabel}</span> : null}
          <span className="text-xs font-black text-slate-500">{itemCountLabel}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">
          {badges.map((badge) => <OrderPriorityBadge key={badge.label} badge={badge} />)}
          {priority ? <OrderPriorityBadge badge={priority} /> : null}
          <OrderPriorityBadge badge={status} />
        </span>
        <ChevronDown className={cn("size-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
      </span>
    </button>
  );
});
