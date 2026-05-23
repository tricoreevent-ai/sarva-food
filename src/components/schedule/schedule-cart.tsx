"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type ScheduleCartLine = MenuItem & { quantity: number };

export function ScheduleCart({
  items,
  dateLabel,
  slotLabel,
  orderType,
  taxEnabled = true,
  onTaxToggle,
  onQuantity,
  onReview,
}: {
  items: ScheduleCartLine[];
  dateLabel: string;
  slotLabel: string;
  orderType: string;
  taxEnabled?: boolean;
  onTaxToggle?: (enabled: boolean) => void;
  onQuantity: (id: string, quantity: number) => void;
  onReview: () => void;
}) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const packaging = items.length ? 10 : 0;
  const tax = taxEnabled ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + packaging + tax;

  return (
    <aside className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:top-24">
      <h2 className="font-black text-slate-950">Your Order</h2>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
        {dateLabel || "Select date"} · {slotLabel || "Select slot"} · {orderType}
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-black">{item.name}</p>
              <p className="text-xs text-slate-500">{formatCurrency(item.price)}</p>
            </div>
            <div className="flex items-center rounded-lg border">
              <Button variant="ghost" size="icon-sm" onClick={() => onQuantity(item.id, item.quantity - 1)}><Minus className="size-4" /></Button>
              <span className="w-7 text-center text-sm font-black">{item.quantity}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => onQuantity(item.id, item.quantity + 1)}><Plus className="size-4" /></Button>
            </div>
            <Button variant="ghost" size="icon-sm" className="text-red-600" onClick={() => onQuantity(item.id, 0)}><Trash2 className="size-4" /></Button>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">Your cart is empty</div>
        )}
      </div>
      <div className="mt-4 space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
        <div className="flex justify-between"><span>Packaging</span><span>{formatCurrency(packaging)}</span></div>
        <label className="flex items-center justify-between rounded-xl bg-orange-50/60 px-3 py-2">
          <span>GST / Tax</span>
          <span className="flex items-center gap-2">
            <span>{formatCurrency(tax)}</span>
            {onTaxToggle ? <input type="checkbox" checked={taxEnabled} onChange={(event) => onTaxToggle(event.target.checked)} /> : null}
          </span>
        </label>
        <div className="flex justify-between text-lg font-black"><span>Total</span><span>{formatCurrency(total)}</span></div>
      </div>
      <Button className="mt-4 h-12 w-full bg-orange-600 hover:bg-orange-700" disabled={!items.length && orderType !== "catering"} onClick={onReview}>
        {orderType === "catering" ? "Review Request" : "Review Order"}
      </Button>
    </aside>
  );
}
