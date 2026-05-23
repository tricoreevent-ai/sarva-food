"use client";

import { useState } from "react";
import { Banknote, ChefHat, PauseCircle, ReceiptText, RotateCcw, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItem } from "@/components/pos/cart-item";
import { CustomerSelector } from "@/components/pos/customer-selector";
import { OrderSummary } from "@/components/pos/order-summary";
import { TableSelector } from "@/components/pos/table-selector";
import type { PaymentOption, PosBill, PosOrderType, PosTable } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type Totals = {
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  packingCharge: number;
  serviceCharge: number;
  total: number;
};

type LookupItem = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  subtitle?: string;
  meta?: string;
};

const orderTypes = ["dine-in", "parcel", "delivery", "takeaway"] as const;

export function CartPanel({
  bill,
  totals,
  tables,
  lookupItems,
  onOrderType,
  onTable,
  onCustomer,
  onLookup,
  onQuantity,
  onRemove,
  onSendKot,
  onCheckout,
  onClear,
  onHold,
  onSave,
  onPayment,
  onDiscount,
  applyGst,
  onApplyGst,
  waiveParcelCharge,
  onWaiveParcelCharge,
}: {
  bill: PosBill;
  totals: Totals;
  tables: PosTable[];
  lookupItems: LookupItem[];
  onOrderType: (value: PosOrderType) => void;
  onTable: (value: string) => void;
  onCustomer: (customer: { id?: string; name?: string; phone?: string }) => void;
  onLookup: () => void;
  onQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onSendKot: () => void;
  onCheckout: () => void;
  onClear: () => void;
  onHold: () => void;
  onSave: () => void;
  onPayment: (payment: PaymentOption) => void;
  onDiscount: (amount: number) => void;
  applyGst: boolean;
  onApplyGst: (value: boolean) => void;
  waiveParcelCharge: boolean;
  onWaiveParcelCharge: (value: boolean) => void;
}) {
  const [discountType, setDiscountType] = useState<"percentage" | "flat" | "item" | "coupon">("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const subtotal = bill.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  function applyDiscount() {
    const value = Number(discountValue) || 0;
    if (discountType === "percentage") onDiscount(Math.min(subtotal, Math.round((subtotal * value) / 100)));
    if (discountType === "flat") onDiscount(Math.min(subtotal, value));
    if (discountType === "item") onDiscount(Math.min(subtotal, value || bill.lines[0]?.price || 0));
    if (discountType === "coupon") onDiscount(Math.min(subtotal, value || 50));
  }

  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm xl:h-[calc(100vh-6rem)]">
      <div className="border-b border-slate-100 p-4">
        <div className="customer-scroll flex gap-2 overflow-x-auto pb-1">
            {orderTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onOrderType(type)}
              className={bill.orderType === type ? "h-11 min-w-28 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-800" : "h-11 min-w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600"}
            >
                {type === "dine-in" ? "Dine-in" : type === "parcel" ? "Parcel" : type === "takeaway" ? "Quick Bill" : "Online"}
            </button>
            ))}
        </div>
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <TableSelector orderType={bill.orderType} table={bill.table} tables={tables} onTable={onTable} />
          <Button variant="ghost" size="icon" aria-label="More cart actions" title="Receipt and order details">
            <ReceiptText className="size-5" />
          </Button>
        </div>
        <div className="mt-3">
          <CustomerSelector customerName={bill.customerName} customerPhone={bill.customerPhone} lookupItems={lookupItems} onCustomer={onCustomer} onLookup={onLookup} />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {bill.lines.length ? bill.lines.map((line) => (
          <CartItem
            key={line.itemId}
            line={line}
            onQuantity={(quantity) => onQuantity(line.itemId, quantity)}
            onRemove={() => onRemove(line.itemId)}
          />
        )) : (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <div>
              <p className="font-black text-slate-950">Cart is empty</p>
              <p className="mt-1 text-sm text-slate-500">Select items from the menu to start billing.</p>
            </div>
          </div>
        )}
        <button className="h-9 w-full rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500">
          + Add note for kitchen
        </button>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_90px_auto]">
            <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700" value={discountType} onChange={(event) => setDiscountType(event.target.value as typeof discountType)} title="Choose discount type">
              <option value="percentage">Percentage discount</option>
              <option value="flat">Flat discount</option>
              <option value="item">Item discount</option>
              <option value="coupon">Coupon</option>
            </select>
            <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold" inputMode="decimal" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} placeholder="Value" />
            <Button type="button" size="sm" variant="outline" onClick={applyDiscount} disabled={!bill.lines.length}>Apply</Button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700" onClick={() => onDiscount(Math.min(subtotal, bill.lines[0]?.price ?? 0))} disabled={!bill.lines.length}>
              Complimentary item
            </button>
            <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700" onClick={() => onApplyGst(false)}>
              No GST
            </button>
            <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700" onClick={() => onWaiveParcelCharge(true)}>
              Waive parcel charge
            </button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 space-y-3 border-t border-slate-100 bg-white p-4">
        <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
          Payment
          <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700" value={bill.payment} onChange={(event) => onPayment(event.target.value as PaymentOption)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700" title="Apply GST to this bill">
            Apply GST
            <input type="checkbox" checked={applyGst} onChange={(event) => onApplyGst(event.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700" title="Remove packing or parcel charge from this bill">
            Parcel charge
            <input type="checkbox" checked={!waiveParcelCharge} onChange={(event) => onWaiveParcelCharge(!event.target.checked)} />
          </label>
        </div>
        <OrderSummary subtotal={totals.subtotal} discount={totals.discount} cgst={totals.cgst} sgst={totals.sgst} packing={totals.packingCharge} service={totals.serviceCharge} total={totals.total} />
        <div className="grid gap-2">
          <Button className="h-12 bg-emerald-700 text-base text-white hover:bg-emerald-800" onClick={onCheckout} disabled={!bill.lines.length || bill.paid}>
            <Banknote className="size-5" />
            Checkout {formatCurrency(totals.total)}
          </Button>
          <Button variant="outline" className="h-11" onClick={onSendKot} disabled={!bill.lines.length}>
            <Send className="size-4" />
            Send to Kitchen
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={onHold} disabled={!bill.lines.length}>
            <PauseCircle className="size-4" />
            Hold
          </Button>
          <Button variant="outline" size="sm" onClick={onSave} disabled={!bill.lines.length}>
            <Save className="size-4" />
            Save
          </Button>
          <Button variant="outline" size="sm" className="text-red-600" onClick={onClear}>
            <RotateCcw className="size-4" />
            Clear
          </Button>
        </div>
        {bill.linkedKitchenOrderId ? (
          <div className="animate-pulse rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            <ChefHat className="mr-2 inline size-4" />
            Kitchen ticket sent. Track it from Kitchen Queue.
          </div>
        ) : null}
      </div>
    </aside>
  );
}
