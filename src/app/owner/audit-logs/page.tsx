"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  createdAt?: string;
  userName?: string;
  userId?: string;
  role?: string;
  module?: string;
  action?: string;
  entityId?: string;
  note?: string;
};

export default function OwnerAuditLogsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (module) params.set("module", module);
    const response = await fetch(`/api/owner/audit-logs?${params}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as { data?: Row[] };
    setRows(response.ok ? payload.data ?? [] : []);
    setLoading(false);
  }, [module]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const data = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? rows.filter((row) => `${row.userName} ${row.userId} ${row.role} ${row.module} ${row.action} ${row.entityId} ${row.note}`.toLowerCase().includes(term)) : rows;
  }, [query, rows]);

  const columns: AdvancedColumn<Row>[] = [
    { key: "createdAt", label: "Date", render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString("en-IN") : "-" },
    { key: "userName", label: "User", render: (row) => row.userName || row.userId || "-" },
    { key: "role", label: "Role" },
    { key: "module", label: "Module" },
    { key: "action", label: "Action" },
    { key: "entityId", label: "Entity" },
    { key: "note", label: "Details" },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Audit Logs" description="User, order, kitchen, inventory, accounting, printer, access, and settings activity." action={<Button asChild variant="outline"><a href={`/api/owner/audit-logs?format=csv${module ? `&module=${encodeURIComponent(module)}` : ""}`}><Download className="size-4" />Export CSV</a></Button>} />
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <label className="relative"><Search className="absolute left-3 top-3.5 size-4 text-slate-400" /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user, action, entity..." /></label>
        <select className="h-11 rounded-md border bg-white px-3 text-sm font-bold" value={module} onChange={(event) => setModule(event.target.value)}>
          <option value="">All modules</option>
          {["auth", "access", "staff", "orders", "kitchen", "menu", "inventory", "accounting", "printers", "settings"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <Button variant="outline" disabled={loading} onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button>
      </div>
      <AdvancedDataTable title={loading ? "Loading audit logs..." : "Activity history"} columns={columns} rows={data} pageSize={15} exportFilename="audit-logs.csv" />
    </div>
  );
}
