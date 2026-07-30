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

  return (
    <nav className={cn(sticky && "sticky top-0 z-20 bg-inherit py-1", className)} aria-labelledby={labelId}>
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="mb-1 flex items-center gap-3 px-1">
          <h2 id={labelId} className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{displayLabel}</h2>
        </div>
        <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap sm:gap-1.5">
          {options.map((item) => <FilterChip key={item.id} item={item} active={value === item.id} readOnly={readOnly} onChange={onChange} />)}
        </div>
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
        "inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 disabled:cursor-default sm:min-h-10 sm:justify-start motion-reduce:transition-none",
        active ? toneClass(item.tone) : "border-transparent text-slate-600 hover:bg-slate-50",
      )}
      aria-label={`${item.label}: ${item.count} orders${item.insight ? `. ${item.insight}` : ""}`}
      aria-pressed={active}
      title={item.insight ? `${item.label}: ${item.count}. ${item.insight}` : `${item.label}: ${item.count}`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
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
