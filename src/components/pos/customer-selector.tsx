"use client";

import { Phone, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

type LookupItem = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  subtitle?: string;
  meta?: string;
};

export function CustomerSelector({
  customerName,
  customerPhone,
  lookupItems,
  onCustomer,
  onLookup,
}: {
  customerName?: string;
  customerPhone?: string;
  lookupItems: LookupItem[];
  onCustomer: (customer: { id?: string; name?: string; phone?: string }) => void;
  onLookup: () => void;
}) {
  const matches = lookupItems
    .filter((item) => {
      const key = `${customerName ?? ""} ${customerPhone ?? ""}`.trim().toLowerCase();
      if (!key) return false;
      return [item.name, item.phone, item.email].filter(Boolean).join(" ").toLowerCase().includes(key);
    })
    .slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <UserRound className="absolute left-3 top-3 size-4 text-slate-400" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={customerName ?? ""}
            onChange={(event) => onCustomer({ name: event.target.value, phone: customerPhone })}
            placeholder="Guest Customer"
          />
        </label>
        <Button variant="outline" className="h-11 border-emerald-200 text-emerald-700">
          Add customer
        </Button>
      </div>
      <label className="relative block">
        <Phone className="absolute left-3 top-3 size-4 text-slate-400" />
        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          inputMode="tel"
          value={customerPhone ?? ""}
          onChange={(event) => onCustomer({ name: customerName, phone: event.target.value })}
          onBlur={onLookup}
          placeholder="Phone optional"
        />
        <Button type="button" className="absolute right-1 top-1" variant="ghost" size="icon-sm" onClick={onLookup} aria-label="Lookup customer phone">
          <Search className="size-4" />
        </Button>
      </label>
      {matches.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {matches.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
              onClick={() => onCustomer({ id: customer.id, name: customer.name, phone: customer.phone })}
            >
              <span className="font-bold text-slate-800">{customer.name}</span>
              <span className="text-xs font-semibold text-slate-500">{customer.phone}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
