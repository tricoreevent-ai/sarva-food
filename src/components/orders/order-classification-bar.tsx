"use client";

import { useId } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ChefHat, ClipboardList, CircleDollarSign, Globe2, PackageCheck, QrCode, ReceiptText, RefreshCw, Truck, Utensils, Wifi, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderFilterOption } from "@/lib/order-classification";

const icons: Record<string, LucideIcon> = {
  all: ClipboardList,
  "dine-in": Utensils,
  parcel: PackageCheck,
  delivery: Truck,
  online: Wifi,
  qr: QrCode,
  website: Globe2,
  swiggy: Truck,
  zomato: Utensils,
  ondc: Globe2,
  scheduled: CalendarClock,
  catering: ChefHat,
  cancelled: AlertTriangle,
  new: ClipboardList,
  kitchen: ChefHat,
  preparing: ChefHat,
  ready: CheckCircle2,
  serving: Utensils,
  completed: CheckCircle2,
  delayed: CalendarClock,
  critical: AlertTriangle,
  "pending-payment": CircleDollarSign,
  paid: ReceiptText,
  refund: RefreshCw,
};

const overflowFilterIds = new Set(["critical", "delayed", "refund", "cancelled", "archived", "old-orders"]);

export function OrderClassificationBar<T extends string>({
  value,
  options,
  onChange,
  label = "Order Channels",
  className,
  sticky,
  readOnly,
}: {
  value: T;
  options: Array<OrderFilterOption<T>>;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
  sticky?: boolean;
  readOnly?: boolean;
}) {
  const id = useId();
  const displayLabel = filterLabel(label);
  const labelId = `${id}-order-filters`;
  const [primaryOptions, moreOptions] = options.reduce<[Array<OrderFilterOption<T>>, Array<OrderFilterOption<T>>]>(
    (groups, item) => {
      const isOverflow = options.length > 10 && item.count === 0 && item.id !== value && overflowFilterIds.has(item.id);
      groups[isOverflow ? 1 : 0].push(item);
      return groups;
    },
    [[], []],
  );

  return (
    <nav className={cn(sticky && "sticky top-0 z-20 bg-inherit py-1", className)} aria-labelledby={labelId}>
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <h2 id={labelId} className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{displayLabel}</h2>
          <span className="text-[10px] font-bold text-slate-400">{options.length} filters</span>
        </div>
        <div className="customer-scroll -mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {primaryOptions.map((item) => <FilterChip key={item.id} item={item} active={value === item.id} readOnly={readOnly} onChange={onChange} />)}
        </div>
        {moreOptions.length ? (
          <details className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-1">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-xs font-black text-slate-500 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 [&::-webkit-details-marker]:hidden motion-reduce:transition-none">
              More filters
              <span className="inline-flex min-w-5 justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px]">{moreOptions.length}</span>
            </summary>
            <div className="customer-scroll mt-1 flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {moreOptions.map((item) => <FilterChip key={item.id} item={item} active={value === item.id} readOnly={readOnly} onChange={onChange} />)}
            </div>
          </details>
        ) : null}
      </div>
    </nav>
  );
}

function filterLabel(label: string) {
  if (/operational state|operations/i.test(label)) return "Order Status";
  if (/classification/i.test(label)) return "Order Channels";
  return label;
}

function FilterChip<T extends string>({
  item,
  active,
  readOnly,
  onChange,
}: {
  item: OrderFilterOption<T>;
  active: boolean;
  readOnly?: boolean;
  onChange: (value: T) => void;
}) {
  const Icon = icons[item.id] ?? ClipboardList;
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={() => onChange(item.id)}
      className={cn(
        "inline-flex min-h-10 flex-none snap-start items-center gap-2 rounded-lg border px-3 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 disabled:cursor-default sm:flex-initial motion-reduce:transition-none",
        active ? toneClass(item.tone) : "border-transparent text-slate-600 hover:bg-slate-50",
      )}
      aria-label={`${item.label}: ${item.count} orders${item.insight ? `. ${item.insight}` : ""}`}
      aria-pressed={active}
      title={item.insight ? `${item.label}: ${item.count}. ${item.insight}` : `${item.label}: ${item.count}`}
    >
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
      <span className={cn("inline-flex min-w-5 shrink-0 justify-center rounded-full px-1.5 py-0.5 text-[10px]", active ? activeCountClass(item.tone) : "bg-slate-100 text-slate-500")}>{item.count}</span>
      {item.insight ? <span className={cn("size-2 shrink-0 rounded-full", insightClass(item.tone))} aria-hidden="true" /> : null}
    </button>
  );
}

function toneClass(tone: OrderFilterOption["tone"]) {
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "info") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-300 bg-slate-50 text-slate-950";
}

function activeCountClass(tone: OrderFilterOption["tone"]) {
  if (tone === "danger") return "bg-red-100 text-red-700";
  if (tone === "warning") return "bg-amber-100 text-amber-700";
  if (tone === "success") return "bg-emerald-100 text-emerald-700";
  if (tone === "info") return "bg-blue-100 text-blue-700";
  return "bg-slate-200 text-slate-700";
}

function insightClass(tone: OrderFilterOption["tone"]) {
  if (tone === "danger") return "bg-red-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "success") return "bg-emerald-500";
  if (tone === "info") return "bg-blue-500";
  return "bg-slate-400";
}
