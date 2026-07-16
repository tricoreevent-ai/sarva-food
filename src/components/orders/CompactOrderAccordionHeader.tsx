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
        "grid min-h-[92px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left",
        (workflow.length || sideStats.length) && "xl:grid-cols-[minmax(12rem,0.9fr)_minmax(28rem,1.8fr)_minmax(12rem,0.8fr)_auto]",
      )}
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
      {workflow.length ? (
        <span className="hidden min-w-0 grid-cols-6 items-start gap-1 xl:grid" aria-label="Order workflow">
          {workflow.map((step) => (
            <span key={step.id} className="grid min-w-0 gap-1">
              <span className="flex items-center">
                <span className={cn("h-px flex-1", step.state === "pending" ? "bg-slate-200" : step.state === "blocked" ? "bg-red-200" : "bg-emerald-200")} />
                <span className={cn("mx-1 grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-black", workflowStepClass(step.state))}>
                  {step.icon ?? null}
                </span>
                <span className={cn("h-px flex-1", step.state === "pending" ? "bg-slate-200" : step.state === "blocked" ? "bg-red-200" : "bg-emerald-200")} />
              </span>
              <span className="truncate text-center text-[11px] font-black text-slate-700">{step.label}</span>
              {step.sublabel ? <span className="truncate text-center text-[10px] font-semibold text-slate-500">{step.sublabel}</span> : null}
            </span>
          ))}
        </span>
      ) : null}
      {sideStats.length ? (
        <span className="hidden min-w-0 justify-end gap-3 xl:grid">
          {sideStats.map((stat) => (
            <span key={stat.label} className="min-w-0 text-right">
              <span className="block truncate text-[10px] font-black uppercase text-slate-400">{stat.label}</span>
              <span className={cn("block truncate text-lg font-black", stat.tone === "danger" ? "text-red-700" : stat.tone === "success" ? "text-emerald-700" : stat.tone === "warning" ? "text-amber-700" : "text-slate-950")}>{stat.value}</span>
            </span>
          ))}
        </span>
      ) : null}
      <span className="flex shrink-0 items-center justify-end gap-2">
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
