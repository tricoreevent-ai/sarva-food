import { ArrowLeft, CalendarClock, MapPin, PencilLine, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScheduleCartLine } from "@/components/schedule/schedule-cart";
import { formatCurrency } from "@/lib/utils";

export function ScheduleSummary({
  restaurantName,
  dateLabel,
  slotLabel,
  orderType,
  items,
  submitting,
  taxEnabled = true,
  onBack,
  onEditSlot,
  onEditItems,
  onEditType,
  onConfirm,
}: {
  restaurantName: string;
  dateLabel: string;
  slotLabel: string;
  orderType: string;
  items: ScheduleCartLine[];
  submitting?: boolean;
  taxEnabled?: boolean;
  onBack?: () => void;
  onEditSlot?: () => void;
  onEditItems?: () => void;
  onEditType?: () => void;
  onConfirm: () => void;
}) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const packaging = items.length ? 10 : 0;
  const tax = taxEnabled ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + packaging + tax;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {onBack ? (
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : null}
        <h2 className="text-xl font-black">Review & Confirm</h2>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <p className="font-black">{restaurantName}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-slate-600"><CalendarClock className="size-4" />{dateLabel} · {slotLabel}</p>
          {onEditSlot ? <button type="button" className="text-xs font-black text-orange-600" onClick={onEditSlot}>Edit slot</button> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-slate-600"><MapPin className="size-4" />{orderType}</p>
          {onEditType ? <button type="button" className="text-xs font-black text-orange-600" onClick={onEditType}>Edit type</button> : null}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <h3 className="font-black">Items</h3>
        {onEditItems ? (
          <button type="button" className="inline-flex items-center gap-1 text-xs font-black text-orange-600" onClick={onEditItems}>
            <PencilLine className="size-3.5" />
            Edit items
          </button>
        ) : null}
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-3 text-sm">
            <span>{item.name} x {item.quantity}</span>
            <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
        <div className="flex justify-between"><span>Packaging</span><span>{formatCurrency(packaging)}</span></div>
        <div className="rounded-xl bg-orange-50/60 p-3">
          <div className="flex items-center gap-2 font-black text-slate-950">
            <ReceiptText className="size-4 text-orange-600" />
            GST / Tax {taxEnabled ? "(optional applied)" : "(not applied)"}
          </div>
          <div className="mt-2 flex justify-between"><span>GST 5%</span><span>{formatCurrency(tax)}</span></div>
        </div>
        <div className="flex justify-between text-xl font-black"><span>Total</span><span>{formatCurrency(total)}</span></div>
      </div>
      <Button className="mt-5 h-12 w-full bg-orange-600 hover:bg-orange-700" onClick={onConfirm} disabled={submitting || (!items.length && orderType !== "catering")}>
        {submitting ? "Sending request..." : orderType === "catering" ? "Submit Catering Request" : "Confirm Scheduled Order"}
      </Button>
    </section>
  );
}
