"use client";

import { Table2 } from "lucide-react";
import type { PosTable } from "@/lib/types";

export function TableSelector({
  orderType,
  table,
  tables,
  onTable,
}: {
  orderType: string;
  table: string;
  tables: PosTable[];
  onTable: (value: string) => void;
}) {
  if (orderType !== "dine-in") {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">No table required</div>;
  }

  return (
    <label className="relative block">
      <Table2 className="absolute left-3 top-3 size-4 text-slate-400" />
      <input
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        list="pos-table-options"
        value={table === "DIRECT" ? "" : table}
        onChange={(event) => onTable(event.target.value.trim() ? event.target.value.toUpperCase() : "DIRECT")}
        placeholder="Table required"
      />
      <datalist id="pos-table-options">
        {tables.map((item) => <option key={item.table} value={item.table} />)}
      </datalist>
    </label>
  );
}
