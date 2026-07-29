"use client";

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
  label = "Order classification",
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
  return (
    <nav className={cn(sticky && "sticky top-0 z-20 bg-inherit py-1", className)} aria-label={label}>
      <div className="customer-scroll flex snap-x snap-mandatory gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {options.map((item) => {
          const Icon = icons[item.id] ?? ClipboardList;
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex min-h-10 snap-start items-center gap-2 rounded-lg border px-3 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 disabled:cursor-default motion-reduce:transition-none",
                active ? toneClass(item.tone) : "border-transparent text-slate-600 hover:bg-slate-50",
              )}
              aria-label={`${item.label}: ${item.count} orders${item.insight ? `. ${item.insight}` : ""}`}
              aria-pressed={active}
            >
              <Icon className="size-4 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? activeCountClass(item.tone) : "bg-slate-100 text-slate-500")}>{item.count}</span>
              {item.insight ? <span className={cn("hidden whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] uppercase sm:inline", insightClass(item.tone))}>{item.insight}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
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
  if (tone === "danger") return "bg-red-50 text-red-700";
  if (tone === "warning") return "bg-amber-50 text-amber-700";
  if (tone === "success") return "bg-emerald-50 text-emerald-700";
  if (tone === "info") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-500";
}
