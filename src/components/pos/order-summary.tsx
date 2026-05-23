import { formatCurrency } from "@/lib/utils";

export function OrderSummary({
  subtotal,
  discount,
  cgst,
  sgst,
  packing,
  service,
  total,
}: {
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  packing: number;
  service: number;
  total: number;
}) {
  const rows = [
    ["Subtotal", subtotal],
    ["Discount", -discount],
    ["CGST", cgst],
    ["SGST", sgst],
    ["Packing / Service", packing + service],
  ] as const;

  return (
    <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 text-slate-700">
          <span>{label}</span>
          <span className="font-semibold">{formatCurrency(value)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 text-xl font-black text-slate-950">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
