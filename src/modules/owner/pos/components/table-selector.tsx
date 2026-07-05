"use client";

import { Table2 } from "lucide-react";
import type { PosTable } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TableSelector({
  orderType,
  table,
  tables,
  occupiedTables = new Set<string>(),
  onTable,
}: {
  orderType: string;
  table: string;
  tables: PosTable[];
  occupiedTables?: Set<string>;
  onTable: (value: string) => void;
}) {
  if (orderType !== "dine-in") {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">No table required</div>;
  }

  const options = tables.map((item) => ({ table: item, state: tableAvailability(item, occupiedTables) }));
  const available = options.filter((item) => item.state.selectable);
  const unavailable = options.filter((item) => !item.state.selectable);
  const selected = options.find((item) => normalizeTableName(item.table.table) === normalizeTableName(table));
  const selectedUnavailable = selected && !selected.state.selectable;

  return (
    <div className="space-y-3">
      <label className="relative block">
        <Table2 className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
        <select
          className={cn(
            "h-12 w-full rounded-xl border bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
            selectedUnavailable ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-800",
          )}
          value={table === "DIRECT" ? "" : table}
          onChange={(event) => onTable(event.target.value || "DIRECT")}
          aria-label="Select available dine-in table"
        >
          <option value="" disabled>{available.length ? "Select available table" : "No available table"}</option>
          {available.length ? (
            <optgroup label="Available">
              {available.map(({ table: item }) => <option key={item.table} value={item.table}>{tableLabel(item)} - Available</option>)}
            </optgroup>
          ) : null}
          {unavailable.length ? (
            <optgroup label="Unavailable">
              {unavailable.map(({ table: item, state }) => <option key={item.table} value={item.table} disabled>{tableLabel(item)} - {state.label}</option>)}
            </optgroup>
          ) : null}
        </select>
      </label>
      {selectedUnavailable ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {tableUnavailableMessage(table, selected.state.label)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.slice(0, 12).map(({ table: item, state }) => (
          <span key={item.table} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-black", toneClass(state.tone))}>
            {item.table} · {state.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function tableLabel(table: PosTable) {
  return [table.table, table.seats ? `${table.seats} seats` : "", table.floor || table.section || ""].filter(Boolean).join(" · ");
}

function normalizeTableName(value?: string) {
  return String(value ?? "").trim().toUpperCase();
}

function tableAvailability(table: PosTable, occupiedTables: Set<string>) {
  const status = String(table.status ?? "").toLowerCase();
  if (table.active === false || table.dineInEnabled === false || status === "inactive") return { label: "Disabled", selectable: false, tone: "slate" as const };
  if (occupiedTables.has(normalizeTableName(table.table)) || status === "occupied" || status === "dining" || status === "bill requested") return { label: "Occupied", selectable: false, tone: "red" as const };
  if (status === "reserved") return { label: "Reserved", selectable: false, tone: "orange" as const };
  if (status === "cleaning") return { label: "Cleaning", selectable: false, tone: "amber" as const };
  return { label: "Available", selectable: true, tone: "green" as const };
}

function tableUnavailableMessage(table: string, label: string) {
  if (label === "Occupied") return `Table ${table} was assigned to another order. Please choose another table.`;
  return `${table} is ${label.toLowerCase()}. Choose an available table before sending KOT.`;
}

function toneClass(tone: "green" | "red" | "orange" | "amber" | "slate") {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "orange") return "border-orange-200 bg-orange-50 text-orange-700";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}
