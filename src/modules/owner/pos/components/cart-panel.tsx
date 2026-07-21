"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CheckCircle2, ChefHat, CreditCard, PauseCircle, Printer, ReceiptText, RotateCcw, Save, Send, Sparkles, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CartItem } from "@/modules/owner/pos/components/cart-item";
import { OrderSummary } from "@/modules/owner/pos/components/order-summary";
import type { PaymentOption, PosBill, PosOrderType } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type Totals = {
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  packingCharge: number;
  serviceCharge: number;
  total: number;
};

export type PosWizardStep = 1 | 2 | 3 | 4 | 5;
export type PosProcessingState = "idle" | "saving" | "kitchen" | "syncing" | "done";

export type CompletedPosOrder = {
  orderId: string;
  kotId?: string;
  total: number;
  table?: string;
  customer?: string;
  payment: PaymentOption;
  orderType: PosOrderType;
};

const orderTypes = ["dine-in", "parcel", "delivery", "takeaway"] as const;

const paymentOptions: Array<{ id: PaymentOption; label: string; description: string; enabled: boolean; icon: typeof Banknote }> = [
  { id: "cash", label: "Cash", description: "Collect cash at counter or table.", enabled: true, icon: Banknote },
  { id: "upi", label: "UPI", description: "UPI payment ready for future gateway.", enabled: true, icon: WalletCards },
  { id: "card", label: "Card", description: "Record card payment manually.", enabled: true, icon: CreditCard },
  { id: "cod", label: "Credit", description: "Mark as restaurant credit.", enabled: true, icon: ReceiptText },
];

export function CartPanel({
  step,
  processingState,
  completedOrder,
  bill,
  totals,
  onStep,
  onOrderType,
  onQuantity,
  onRemove,
  onNextDetails,
  onNextReview,
  onProcessOrder,
  onClear,
  onHold,
  onSave,
  onNewOrder,
  onViewActiveOrders,
  onPrintBill,
  onPayment,
  workflowMode,
  onDiscount,
  applyGst,
  onApplyGst,
  waiveParcelCharge,
  onWaiveParcelCharge,
}: {
  step: PosWizardStep;
  processingState: PosProcessingState;
  completedOrder: CompletedPosOrder | null;
  bill: PosBill;
  totals: Totals;
  onStep: (step: PosWizardStep) => void;
  onOrderType: (value: PosOrderType) => void;
  onQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onNextDetails: () => void;
  onNextReview: () => void;
  onProcessOrder: (capturePayment?: boolean) => void;
  onClear: () => void;
  onHold: () => void;
  onSave: () => void;
  onNewOrder: () => void;
  onViewActiveOrders: () => void;
  onPrintBill: () => void;
  onPayment: (payment: PaymentOption) => void;
  workflowMode?: "payment-first" | "kitchen-first" | "flexible";
  onDiscount: (amount: number) => void;
  applyGst: boolean;
  onApplyGst: (value: boolean) => void;
  waiveParcelCharge: boolean;
  onWaiveParcelCharge: (value: boolean) => void;
}) {
  const [discountType, setDiscountType] = useState<"percentage" | "flat" | "item" | "coupon">("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const subtotal = useMemo(() => bill.lines.reduce((sum, line) => sum + line.price * line.quantity, 0), [bill.lines]);
  const itemCount = useMemo(() => bill.lines.reduce((sum, line) => sum + line.quantity, 0), [bill.lines]);
  const processing = processingState !== "idle";
  const linkedKitchen = Boolean(bill.linkedKitchenOrderId);
  const allowKitchenFirst = workflowMode !== "payment-first";
  const allowPaymentFirst = workflowMode !== "kitchen-first";

  function applyDiscount() {
    const value = Math.max(0, Number(discountValue) || 0);
    if (discountType === "percentage") onDiscount(Math.min(subtotal, Math.round((subtotal * Math.min(100, value)) / 100)));
    if (discountType === "flat") onDiscount(Math.min(subtotal, value));
    if (discountType === "item") onDiscount(Math.min(subtotal, value || bill.lines[0]?.price || 0));
    if (discountType === "coupon") onDiscount(Math.min(subtotal, value || 50));
  }

  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-7.5rem)]">
      <div className="border-b border-slate-100 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">Current Order</p>
            <p className="text-xs font-semibold text-slate-500">{itemCount} item{itemCount === 1 ? "" : "s"} selected</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{formatCurrency(totals.total)}</span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1">
          {(["Items", "Details", "Review", "Process", "Done"] as const).map((label, index) => {
            const value = (index + 1) as PosWizardStep;
            return (
              <button
                key={label}
                type="button"
                onClick={() => value < 4 && onStep(value)}
                disabled={value >= 4}
                title={`${label} step`}
                className={cn(
                  "rounded-xl border px-1.5 py-2 text-[10px] font-black uppercase tracking-wide transition",
                  step === value ? "border-emerald-300 bg-emerald-50 text-emerald-800" : value < step ? "border-emerald-100 bg-white text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400",
                )}
              >
                <span className="mx-auto mb-1 grid size-5 place-items-center rounded-full bg-white text-[11px] shadow-sm">{index + 1}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="items" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              <OrderTypeSelector value={bill.orderType} onChange={onOrderType} />
              <SelectedItems bill={bill} onQuantity={onQuantity} onRemove={onRemove} />
              <SubtotalCard subtotal={totals.subtotal} total={totals.total} />
              <Button className="h-12 w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={onNextDetails} disabled={!bill.lines.length} title="Continue after selecting food">
                Next: Customer & Order Details
              </Button>
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              <SelectedItems bill={bill} onQuantity={onQuantity} onRemove={onRemove} compact />
              <SubtotalCard subtotal={totals.subtotal} total={totals.total} />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => onStep(1)}>Back</Button>
                <Button className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={onNextReview}>Review Order</Button>
              </div>
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              <SelectedItems bill={bill} onQuantity={onQuantity} onRemove={onRemove} compact />
              <DiscountBox
                discountType={discountType}
                discountValue={discountValue}
                onType={setDiscountType}
                onValue={setDiscountValue}
                onApply={applyDiscount}
                onComplimentary={() => onDiscount(Math.min(subtotal, bill.lines[0]?.price ?? 0))}
                onNoGst={() => onApplyGst(false)}
                onNoParcel={() => onWaiveParcelCharge(true)}
                disabled={!bill.lines.length}
              />
              <PaymentBox payment={bill.payment} onPayment={onPayment} />
              <div className="grid grid-cols-2 gap-2">
                <ToggleTile label="Apply GST" checked={applyGst} onChange={onApplyGst} title="Apply GST on this bill. Permission rules can restrict this later." />
                <ToggleTile label="Parcel charge" checked={!waiveParcelCharge} onChange={(checked) => onWaiveParcelCharge(!checked)} title="Apply restaurant packing or parcel charge." />
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <OrderSummary subtotal={totals.subtotal} discount={totals.discount} cgst={totals.cgst} sgst={totals.sgst} packing={totals.packingCharge} service={totals.serviceCharge} total={totals.total} />
              </div>
              <div className="grid gap-2">
                {allowPaymentFirst ? (
                  <Button className="h-12 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => onProcessOrder(true)} disabled={!bill.lines.length || bill.paid || processing} title={linkedKitchen ? "Open payment collection when no new kitchen ticket is needed" : "Continue to payment and keep the kitchen ticket synced"}>
                    <Banknote className="size-4" />
                    {linkedKitchen ? "Verify Payment" : `Continue to Payment ${formatCurrency(totals.total)}`}
                  </Button>
                ) : null}
                {allowKitchenFirst ? (
                  <Button variant={allowPaymentFirst ? "outline" : "default"} className="h-11" onClick={() => onProcessOrder(false)} disabled={!bill.lines.length || processing} title={linkedKitchen ? "Generate a kitchen ticket only for newly added items" : "Send this order to kitchen without collecting payment"}>
                    <Send className="size-4" />
                    {linkedKitchen ? "Generate Incremental KOT" : "Send To Kitchen"}
                  </Button>
                ) : null}
              </div>
              <Button variant="ghost" className="w-full" onClick={() => onStep(2)}>Back to details</Button>
            </motion.div>
          ) : null}

          {step === 4 ? (
            <motion.div key="processing" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-4">
              <div className="grid place-items-center rounded-2xl bg-emerald-50 p-8 text-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }} className="grid size-16 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
                  <ChefHat className="size-8" />
                </motion.div>
                <h3 className="mt-4 text-lg font-black text-slate-950">Processing order</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">Saving the order, creating KOT, and syncing it to the restaurant queue.</p>
              </div>
              <ProcessingList state={processingState} />
            </motion.div>
          ) : null}

          {step === 5 ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-4">
              <div className="grid place-items-center rounded-2xl bg-emerald-50 p-8 text-center">
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="grid size-20 place-items-center rounded-full bg-emerald-700 text-white shadow-lg">
                  <CheckCircle2 className="size-10" />
                </motion.div>
                <h3 className="mt-4 text-xl font-black text-slate-950">Order placed successfully</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">Kitchen has the ticket. The waiter can print or start a new order.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <InfoRow label="Order ID" value={completedOrder?.orderId ?? bill.invoiceNumber ?? "New order"} />
                <InfoRow label="KOT ID" value={completedOrder?.kotId ?? bill.linkedKitchenOrderId ?? "Kitchen queue"} />
                <InfoRow label="Total" value={formatCurrency(completedOrder?.total ?? totals.total)} />
                <InfoRow label="Payment" value={(completedOrder?.payment ?? bill.payment).toUpperCase()} />
                <InfoRow label="Table / Type" value={completedOrder?.table ?? readableOrderType(completedOrder?.orderType ?? bill.orderType)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={onPrintBill}>
                  <Printer className="size-4" />
                  Print bill
                </Button>
                <Button variant="outline" onClick={onViewActiveOrders}>
                  <ChefHat className="size-4" />
                  Active orders
                </Button>
              </div>
              <Button className="h-12 w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={onNewOrder}>New order</Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {step <= 3 ? (
        <div className="sticky bottom-0 grid gap-2 border-t border-slate-100 bg-white p-3">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={onHold} disabled={!bill.lines.length || processing} title="Hold the current order with selected items">
              <PauseCircle className="size-4" />
              Hold
            </Button>
            <Button variant="outline" size="sm" onClick={onSave} disabled={!bill.lines.length || processing} title="Save this order so it can be resumed later">
              <Save className="size-4" />
              Save
            </Button>
            <Button variant="outline" size="sm" className="text-red-600" onClick={onClear} disabled={!bill.lines.length || processing} title="Clear all selected items and reset this bill">
              <RotateCcw className="size-4" />
              Clear
            </Button>
          </div>
          {bill.linkedKitchenOrderId ? (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              <ChefHat className="mr-2 inline size-4" />
              Active kitchen ticket. Only newly added items generate the next KOT.
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function OrderTypeSelector({ value, onChange }: { value: PosOrderType; onChange: (value: PosOrderType) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase text-slate-500">Order type</p>
      <div className="customer-scroll flex gap-2 overflow-x-auto pb-1">
        {orderTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={cn(
              "h-10 min-w-28 rounded-xl border px-3 text-sm font-black transition",
              value === type ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200",
            )}
          >
            {readableOrderType(type)}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectedItems({ bill, onQuantity, onRemove, compact = false }: { bill: PosBill; onQuantity: (itemId: string, quantity: number) => void; onRemove: (itemId: string) => void; compact?: boolean }) {
  if (!bill.lines.length) {
    return (
      <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
        <div>
          <Sparkles className="mx-auto size-7 text-orange-500" />
          <p className="mt-2 font-black text-slate-950">No items selected</p>
          <p className="mt-1 text-sm text-slate-500">Add food from the menu grid to start the order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", compact && "max-h-72 overflow-y-auto pr-1")}>
      {bill.lines.map((line) => (
        <CartItem
          key={line.itemId}
          line={line}
          onQuantity={(quantity) => onQuantity(line.itemId, quantity)}
          onRemove={() => onRemove(line.itemId)}
        />
      ))}
    </div>
  );
}

function SubtotalCard({ subtotal, total }: { subtotal: number; total: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
      <div className="flex justify-between font-semibold text-slate-500">
        <span>Food subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div className="mt-2 flex justify-between text-base font-black text-slate-950">
        <span>Running total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function DiscountBox({
  discountType,
  discountValue,
  onType,
  onValue,
  onApply,
  onComplimentary,
  onNoGst,
  onNoParcel,
  disabled,
}: {
  discountType: "percentage" | "flat" | "item" | "coupon";
  discountValue: string;
  onType: (value: "percentage" | "flat" | "item" | "coupon") => void;
  onValue: (value: string) => void;
  onApply: () => void;
  onComplimentary: () => void;
  onNoGst: () => void;
  onNoParcel: () => void;
  disabled: boolean;
}) {
  return (
    <details className="rounded-xl border border-slate-200 p-3" open>
      <summary className="cursor-pointer text-sm font-black text-slate-800">Offers, discounts and waivers</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_84px_auto]">
        <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700" value={discountType} onChange={(event) => onType(event.target.value as typeof discountType)} title="Choose discount type">
          <option value="percentage">Percentage</option>
          <option value="flat">Flat amount</option>
          <option value="item">Item discount</option>
          <option value="coupon">Coupon</option>
        </select>
        <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold" inputMode="decimal" value={discountValue} onChange={(event) => onValue(event.target.value)} placeholder="Value" />
        <Button type="button" size="sm" variant="outline" onClick={onApply} disabled={disabled}>Apply</Button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50" onClick={onComplimentary} disabled={disabled} title="Make one item complimentary on this bill">
          Free item
        </button>
        <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700" onClick={onNoGst} title="Remove GST from this bill if permission allows">
          No GST
        </button>
        <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700" onClick={onNoParcel} title="Remove parcel or packing charge">
          No parcel charge
        </button>
      </div>
    </details>
  );
}

function PaymentBox({ payment, onPayment }: { payment: PaymentOption; onPayment: (payment: PaymentOption) => void }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-black text-slate-950">Payment method</p>
      {paymentOptions.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            disabled={!option.enabled}
            onClick={() => onPayment(option.id)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition",
              payment === option.id ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-orange-200",
            )}
          >
            <span className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-slate-50 text-slate-700">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-black text-slate-900">{option.label}</span>
                <span className="block text-xs font-semibold text-slate-500">{option.description}</span>
              </span>
            </span>
            {payment === option.id ? <CheckCircle2 className="size-5 text-emerald-700" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function ToggleTile({ label, checked, onChange, title }: { label: string; checked: boolean; onChange: (checked: boolean) => void; title: string }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700" title={title}>
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ProcessingList({ state }: { state: PosProcessingState }) {
  const rows: Array<{ key: PosProcessingState; label: string; detail: string }> = [
    { key: "saving", label: "Saving order", detail: "Order details are being saved locally and synced." },
    { key: "kitchen", label: "Creating kitchen ticket", detail: "Only new items are sent when this is an active order." },
    { key: "syncing", label: "Updating live screens", detail: "POS, owner orders, and kitchen status are being refreshed." },
  ];
  const activeIndex = Math.max(0, rows.findIndex((row) => row.key === state));
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.key} className={cn("flex items-center gap-3 rounded-xl border p-3", index <= activeIndex || state === "done" ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-white")}>
          <span className={cn("grid size-8 place-items-center rounded-full", index <= activeIndex || state === "done" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-400")}>
            {index < activeIndex || state === "done" ? <CheckCircle2 className="size-4" /> : <ChefHat className="size-4" />}
          </span>
          <span>
            <span className="block text-sm font-black text-slate-950">{row.label}</span>
            <span className="block text-xs font-semibold text-slate-500">{row.detail}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-950">{value}</span>
    </div>
  );
}

function readableOrderType(type: PosOrderType) {
  if (type === "dine-in") return "Dine-in";
  if (type === "takeaway") return "Quick Bill";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
