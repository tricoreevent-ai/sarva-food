"use client";

import { ResponsibilityDisclaimer } from "@/components/legal/responsibility-disclaimer";

export type CateringDraft = {
  fullName: string;
  phone: string;
  email: string;
  whatsapp: string;
  eventType: string;
  guestCount: string;
  eventAddress: string;
  servingTime: string;
  budget: string;
  setupRequired: boolean;
  vesselsNeeded: boolean;
  liveCounter: boolean;
  notes: string;
};

export function CateringForm({ value, onChange }: { value: CateringDraft; onChange: (value: CateringDraft) => void }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
      <div>
        <h3 className="font-black text-slate-950">Catering contact</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">The restaurant will send the revised quotation to this email.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="h-11 rounded-xl border px-3 text-sm" value={value.fullName} onChange={(event) => onChange({ ...value, fullName: event.target.value })} placeholder="Full name" />
        <input className="h-11 rounded-xl border px-3 text-sm" inputMode="tel" value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} placeholder="Phone number" />
        <input className="h-11 rounded-xl border px-3 text-sm" type="email" value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} placeholder="Email for quotation" />
        <input className="h-11 rounded-xl border px-3 text-sm" inputMode="tel" value={value.whatsapp} onChange={(event) => onChange({ ...value, whatsapp: event.target.value })} placeholder="WhatsApp optional" />
      </div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <input className="h-11 rounded-xl border px-3 text-sm" value={value.eventType} onChange={(event) => onChange({ ...value, eventType: event.target.value })} placeholder="Event type" />
        <input className="h-11 rounded-xl border px-3 text-sm" inputMode="numeric" value={value.guestCount} onChange={(event) => onChange({ ...value, guestCount: event.target.value })} placeholder="Guest count" />
        <input className="h-11 rounded-xl border px-3 text-sm" value={value.servingTime} onChange={(event) => onChange({ ...value, servingTime: event.target.value })} placeholder="Serving time" />
        <input className="h-11 rounded-xl border px-3 text-sm" inputMode="numeric" value={value.budget} onChange={(event) => onChange({ ...value, budget: event.target.value })} placeholder="Expected budget optional" />
      </div>
      <textarea className="min-h-20 rounded-xl border px-3 py-2 text-sm" value={value.eventAddress} onChange={(event) => onChange({ ...value, eventAddress: event.target.value })} placeholder="Event address" />
      {(["setupRequired", "vesselsNeeded", "liveCounter"] as const).map((field) => (
        <label key={field} className="flex h-10 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={value[field]} onChange={(event) => onChange({ ...value, [field]: event.target.checked })} />
          {field === "setupRequired" ? "Setup required" : field === "vesselsNeeded" ? "Vessels needed" : "Live counter required"}
        </label>
      ))}
      <textarea className="min-h-20 rounded-xl border px-3 py-2 text-sm" value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} placeholder="Notes" />
      <ResponsibilityDisclaimer />
    </div>
  );
}
