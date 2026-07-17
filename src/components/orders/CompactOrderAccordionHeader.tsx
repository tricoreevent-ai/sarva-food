import { memo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderPriorityBadge } from "./OrderPriorityBadge";
import { OperationalOrderStatusBadge } from "./OperationalOrderStatusBadge";
import type { CompactOrderAccordionProps } from "./OrderAccordion.types";

type Props = Pick<CompactOrderAccordionProps, "orderNumber" | "etaLabel" | "orderTypeLabel" | "tableLabel" | "itemCountLabel" | "status" | "priority" | "badges" | "workflow" | "sideStats" | "isOpen" | "onOpenChange">;

export const CompactOrderAccordionHeader = memo(function CompactOrderAccordionHeader({
  orderNumber,
  etaLabel,
  orderTypeLabel,
  tableLabel,
  itemCountLabel,
  status,
  priority,
  badges = [],
  workflow = [],
  sideStats = [],
  isOpen,
  onOpenChange,
}: Props) {
  return (
    <button
      type="button"
      className={cn(
        "relative grid min-h-[84px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 p-3 text-left",
      )}
      onClick={() => onOpenChange(!isOpen)}
      aria-expanded={isOpen}
    >
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-base font-black leading-tight text-slate-950">{orderNumber}</span>
          <OperationalOrderStatusBadge status={status.label} tone={status.tone} />
        </span>
        <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {tableLabel ? <span className="truncate text-xs font-black text-slate-700">{tableLabel}</span> : null}
          {tableLabel ? <span className="text-slate-300">•</span> : null}
          <span className="text-xs font-bold text-slate-500">{itemCountLabel}</span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-bold text-slate-500">{orderTypeLabel}</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700">{etaLabel}</span>
          {badges.map((badge) => <OrderPriorityBadge key={badge.label} badge={badge} />)}
        </span>
      </span>
      {workflow.length ? (
        <span className="col-span-2 flex h-1 min-w-0 overflow-hidden rounded-full bg-slate-100" aria-label="Order progress">
          {workflow.map((step) => (
            <span key={step.id} title={`${step.label}${step.sublabel ? ` · ${step.sublabel}` : ""}`} className={cn("h-full flex-1", step.state === "complete" ? "bg-emerald-500" : step.state === "active" ? "bg-orange-500" : step.state === "blocked" ? "bg-red-500" : "bg-slate-200")} />
          ))}
        </span>
      ) : null}
      {sideStats.length ? (
        <span className="col-span-2 grid min-w-0 grid-cols-2 gap-3 border-t border-slate-100 pt-2">
          {sideStats.map((stat) => (
            <span key={stat.label} className="min-w-0 text-right">
              <span className="block truncate text-[10px] font-black uppercase text-slate-400">{stat.label}</span>
              <span className={cn("block truncate text-base font-black", stat.tone === "danger" ? "text-red-700" : stat.tone === "success" ? "text-emerald-700" : stat.tone === "warning" ? "text-amber-700" : "text-slate-950")}>{stat.value}</span>
              {stat.subvalue ? <span className={cn("block truncate text-[11px] font-bold", stat.tone === "danger" ? "text-red-600" : stat.tone === "success" ? "text-emerald-600" : "text-slate-500")}>{stat.subvalue}</span> : null}
            </span>
          ))}
        </span>
      ) : null}
      <span className="absolute right-4 top-4 flex shrink-0 items-center justify-end gap-2 xl:static">
        {priority ? <span className="hidden sm:inline-flex"><OrderPriorityBadge badge={priority} /></span> : null}
        <ChevronDown className={cn("size-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
      </span>
    </button>
  );
});
