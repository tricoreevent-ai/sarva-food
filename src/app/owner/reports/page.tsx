"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Order = { id: string; createdAt?: string; channel?: string; fulfillmentType?: string; customerName?: string; customerPhone?: string; status?: string; subtotal?: number; tax?: number; total?: number; paymentStatus?: string; lines?: unknown[] };
type Analytics = { revenue: number; tax: number; orderCount: number; billableOrderCount: number; customerCount: number; loyaltyCount: number; orders: Order[] };
type Preset = "today" | "last7" | "last30";

export default function OwnerReportsPage() {
  const [preset, setPreset] = useState<Preset>("last30");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => rangeFor(preset), [preset]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void fetch(`/api/owner/analytics?from=${range.from.toISOString()}&to=${range.to.toISOString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { data?: Analytics; error?: string };
        if (!response.ok) throw new Error(payload.error || "Reports could not be loaded.");
        setData(payload.data ?? null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Reports could not be loaded.");
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range]);

  const rows = (data?.orders ?? []).map((order) => ({
    ...order,
    date: order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "-",
    channel: order.fulfillmentType ?? order.channel ?? "-",
    customer: order.customerName ?? order.customerPhone ?? "Guest",
    items: order.lines?.length ?? 0,
  }));
  const columns: AdvancedColumn<(typeof rows)[number]>[] = [
    { key: "id", label: "Order" }, { key: "date", label: "Date" }, { key: "channel", label: "Channel" }, { key: "customer", label: "Customer" },
    { key: "status", label: "Status", render: (row) => <Badge variant="muted">{row.status ?? "-"}</Badge> }, { key: "items", label: "Items", align: "right" },
    { key: "tax", label: "Tax", align: "right", render: (row) => formatCurrency(Number(row.tax ?? 0)) }, { key: "total", label: "Total", align: "right", render: (row) => formatCurrency(Number(row.total ?? 0)), exportValue: (row) => Number(row.total ?? 0) },
  ];

  return <div className="space-y-6"><SectionHeader title="Restaurant Reports" description="Revenue and orders are read only from the canonical Firestore orders collection." action={<div className="flex gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button><Button variant="outline" onClick={() => exportRows(rows)}><FileSpreadsheet className="size-4" />CSV</Button></div>} /><Card><CardContent className="flex flex-wrap gap-2 p-4">{(["today", "last7", "last30"] as Preset[]).map((value) => <Button key={value} size="sm" variant={preset === value ? "default" : "outline"} onClick={() => setPreset(value)}>{value === "today" ? "Today" : value === "last7" ? "Last 7 days" : "Last 30 days"}</Button>)}</CardContent></Card>{error ? <Card><CardContent className="p-5 text-sm font-semibold text-destructive">{error}</CardContent></Card> : null}<section className="dashboard-grid"><Metric title="Canonical revenue" value={formatCurrency(data?.revenue ?? 0)} note={`${data?.billableOrderCount ?? 0} billable orders`} /><Metric title="Orders" value={String(data?.orderCount ?? 0)} note="Orders collection" /><Metric title="GST / tax" value={formatCurrency(data?.tax ?? 0)} note="Orders collection" /><Metric title="Customers" value={String(data?.customerCount ?? 0)} note={`${data?.loyaltyCount ?? 0} loyalty accounts`} /></section><AdvancedDataTable title={loading ? "Loading canonical orders" : "Canonical order report"} columns={columns} rows={rows} exportFilename="canonical-orders.csv" /></div>;
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) { return <Card><CardContent className="p-5"><p className="text-sm font-bold text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-black">{value}</p><p className="mt-1 text-sm text-muted-foreground">{note}</p></CardContent></Card>; }
function rangeFor(preset: Preset) { const to = new Date(); to.setHours(23, 59, 59, 999); const from = new Date(to); from.setHours(0, 0, 0, 0); if (preset === "last7") from.setDate(from.getDate() - 6); if (preset === "last30") from.setDate(from.getDate() - 29); return { from, to }; }
function exportRows(rows: Array<Record<string, unknown>>) { const csv = [["Order", "Date", "Customer", "Status", "Tax", "Total"], ...rows.map((row) => [row.id, row.date, row.customer, row.status, row.tax, row.total])].map((row) => row.map((cell) => JSON.stringify(cell ?? "")).join(",")).join("\n"); const link = document.createElement("a"); link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; link.download = "canonical-orders.csv"; link.click(); }
