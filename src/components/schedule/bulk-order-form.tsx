"use client";

export type BulkDraft = {
  quantityEstimate: string;
  packaging: string;
  instructions: string;
};

export function BulkOrderForm({ value, onChange }: { value: BulkDraft; onChange: (value: BulkDraft) => void }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
      <input className="h-11 rounded-xl border px-3 text-sm" inputMode="numeric" value={value.quantityEstimate} onChange={(event) => onChange({ ...value, quantityEstimate: event.target.value })} placeholder="Quantity estimate" />
      <select className="h-11 rounded-xl border px-3 text-sm" value={value.packaging} onChange={(event) => onChange({ ...value, packaging: event.target.value })}>
        <option>Individual packs</option>
        <option>Family packs</option>
        <option>Office buffet packs</option>
      </select>
      <textarea className="min-h-20 rounded-xl border px-3 py-2 text-sm" value={value.instructions} onChange={(event) => onChange({ ...value, instructions: event.target.value })} placeholder="Delivery or packaging instructions" />
    </div>
  );
}
