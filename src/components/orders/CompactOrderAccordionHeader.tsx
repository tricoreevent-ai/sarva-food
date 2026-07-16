import { memo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderPriorityBadge } from "./OrderPriorityBadge";
import { workflowStepClass } from "./OrderAccordion.utils";
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
        "relative grid min-h-[88px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3 text-left",
        (workflow.length || sideStats.length) && "xl:grid-cols-[minmax(15rem,1.05fr)_minmax(32rem,2.25fr)_minmax(13rem,0.9fr)_auto]",
      )}
      onClick={() => onOpenChange(!isOpen)}
      aria-expanded={isOpen}
    >
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-xl font-black leading-tight text-slate-950">{orderNumber}</span>
          <OrderPriorityBadge badge={status} />
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
        <span className="col-span-2 grid min-w-0 grid-cols-6 items-start gap-1 border-t border-slate-100 pt-3 md:col-span-1 md:border-0 md:pt-0 xl:grid" aria-label="Order workflow">
          {workflow.map((step) => (
            <span key={step.id} className="grid min-w-0 gap-1">
              <span className="flex items-center">
                <span className={cn("h-px flex-1", step.state === "pending" ? "bg-slate-200" : step.state === "blocked" ? "bg-red-200" : step.state === "active" ? "bg-orange-200" : "bg-emerald-300")} />
                <span className={cn("mx-1 grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-black", workflowStepClass(step.state, step.tone))}>
                  {step.icon ?? null}
                </span>
                <span className={cn("h-px flex-1", step.state === "pending" ? "bg-slate-200" : step.state === "blocked" ? "bg-red-200" : step.state === "active" ? "bg-orange-200" : "bg-emerald-300")} />
              </span>
              <span className="truncate text-center text-[10px] font-black text-slate-700 sm:text-[11px]">{step.label}</span>
              {step.sublabel ? <span className="hidden truncate text-center text-[10px] font-semibold text-slate-500 sm:block">{step.sublabel}</span> : null}
            </span>
          ))}
        </span>
      ) : null}
      {sideStats.length ? (
        <span className="hidden min-w-0 grid-cols-2 justify-end gap-4 xl:grid">
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
