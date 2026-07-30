"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { applyRealtimePatch } from "@/lib/realtime-patch";
import { shouldUseOperationalStreams } from "@/lib/client-operational-streams";
import { formatCurrency } from "@/lib/utils";

type Order = {
  id: string;
  createdAt?: string;
  channel?: string;
  fulfillmentType?: string;
  orderType?: string;
  customerName?: string;
  customerPhone?: string;
  customer?: { name?: string; phone?: string };
  tableNumber?: string;
  waiterName?: string;
  status?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  paidAmount?: number;
  tipAmount?: number;
  tipMethod?: string;
  tipWaiterName?: string;
  payment?: string;
  cashierName?: string;
  totals?: { subtotal?: number; discount?: number; tax?: number; total?: number };
  paymentStatus?: string;
  lines?: unknown[];
};
type Analytics = { revenue: number; grossRevenue?: number; netRevenue?: number; tips?: number; tax: number; pendingPayments?: number; discounts?: number; refunds?: number; orderCount: number; billableOrderCount: number; customerCount: number; loyaltyCount: number; orders: Order[] };
type ReportStreamPayload = { orders?: Order[]; ordersUpsert?: Order[]; orderIdsRemoved?: string[] };
type Preset = "today" | "last7" | "last30";
type Filters = { status: string; payment: string; channel: string; waiter: string; method: string; tip: string; amountMin: string; amountMax: string; search: string };

const defaultFilters: Filters = { status: "all", payment: "all", channel: "all", waiter: "all", method: "all", tip: "all", amountMin: "", amountMax: "", search: "" };

export default function OwnerReportsPage() {
  const [preset, setPreset] = useState<Preset>("last30");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => rangeFor(preset), [preset]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void fetch(`/api/owner/analytics?from=${range.from.toISOString()}&to=${range.to.toISOString()}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({})) as { data?: Analytics; error?: string };
          if (!response.ok) throw new Error(payload.error || "Reports could not be loaded.");
          setData(payload.data ? summarizeReports(payload.data, payload.data.orders.map(reportOrderFromLive)) : null);
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
          setError(reason instanceof Error ? reason.message : "Reports could not be loaded.");
          setData(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [range]);

  useEffect(() => {
    if (!shouldUseOperationalStreams()) return;
    const events = new EventSource("/api/owner/reports/stream");
    events.addEventListener("state", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as ReportStreamPayload;
        const full = payload.orders?.map(reportOrderFromLive).filter((order) => orderInRange(order, range));
        const upsert = payload.ordersUpsert?.map(reportOrderFromLive).filter((order) => orderInRange(order, range));
        if (!full && !upsert?.length && !payload.orderIdsRemoved?.length) return;
        setData((current) => current ? summarizeReports(current, applyRealtimePatch(current.orders, full, upsert, payload.orderIdsRemoved)) : current);
      } catch {
        setError("Live report update could not be read.");
      }
    });
    return () => events.close();
  }, [range]);

  const rows = useMemo(() => filteredOrders(data?.orders ?? [], filters).map((order) => ({
    ...order,
    date: order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "-",
    channel: order.fulfillmentType ?? order.orderType ?? order.channel ?? "-",
    customerLabel: order.customerName ?? order.customerPhone ?? "Guest",
    waiter: order.tipWaiterName || order.waiterName || "Unassigned",
    paid: paidAmount(order),
    tip: tipAmount(order),
    pending: Math.max(0, Number(order.total ?? 0) - paidAmount(order)),
    items: order.lines?.length ?? 0,
  })), [data?.orders, filters]);
  const metrics = useMemo(() => summarizeRows(rows), [rows]);
  const columns: AdvancedColumn<(typeof rows)[number]>[] = [
    { key: "id", label: "Order" },
    { key: "date", label: "Date" },
    { key: "channel", label: "Channel" },
    { key: "customerLabel", label: "Customer" },
    { key: "waiter", label: "Waiter" },
    { key: "status", label: "Status", render: (row) => <Badge variant="muted">{row.status ?? "-"}</Badge> },
    { key: "paymentStatus", label: "Payment", render: (row) => <Badge variant={row.paymentStatus === "paid" ? "success" : "muted"}>{row.paymentStatus ?? "pending"}</Badge> },
    { key: "paid", label: "Revenue", align: "right", render: (row) => formatCurrency(row.paid), exportValue: (row) => row.paid },
    { key: "tip", label: "Tips", align: "right", render: (row) => formatCurrency(row.tip), exportValue: (row) => row.tip },
    { key: "tax", label: "GST", align: "right", render: (row) => formatCurrency(paidTaxAmount(row)), exportValue: (row) => paidTaxAmount(row) },
    { key: "pending", label: "Pending", align: "right", render: (row) => formatCurrency(row.pending), exportValue: (row) => row.pending },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Restaurant Reports" description="Revenue is based on collected payments. Tips are separated from restaurant revenue." action={<div className="flex gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button><Button variant="outline" onClick={() => exportRows(rows)}><FileSpreadsheet className="size-4" />CSV</Button></div>} />
      <Card><CardContent className="grid gap-3 p-4 lg:grid-cols-[auto_repeat(7,minmax(0,1fr))]">
        <div className="flex flex-wrap gap-2">{(["today", "last7", "last30"] as Preset[]).map((value) => <Button key={value} size="sm" variant={preset === value ? "default" : "outline"} onClick={() => setPreset(value)}>{value === "today" ? "Today" : value === "last7" ? "Last 7 days" : "Last 30 days"}</Button>)}</div>
        <FilterSelect label="Status" value={filters.status} values={["all", "new", "accepted", "preparing", "ready", "picked-up", "served", "completed", "cancelled", "rejected"]} onChange={(status) => setFilters((current) => ({ ...current, status }))} />
        <FilterSelect label="Payment" value={filters.payment} values={["all", "pending", "partial", "paid", "refunded"]} onChange={(payment) => setFilters((current) => ({ ...current, payment }))} />
        <FilterSelect label="Method" value={filters.method} values={["all", "cash", "upi", "card", "razorpay", "cod", "credit"]} onChange={(method) => setFilters((current) => ({ ...current, method }))} />
        <FilterSelect label="Channel" value={filters.channel} values={["all", "delivery", "parcel", "dine-in", "pos", "web", "qr", "swiggy", "zomato", "magicpin", "ondc"]} onChange={(channel) => setFilters((current) => ({ ...current, channel }))} />
        <FilterSelect label="Tip" value={filters.tip} values={["all", "with-tip", "no-tip"]} onChange={(tip) => setFilters((current) => ({ ...current, tip }))} />
        <input className="h-10 rounded-xl border px-3 text-sm font-semibold" inputMode="decimal" value={filters.amountMin} onChange={(event) => setFilters((current) => ({ ...current, amountMin: event.target.value }))} placeholder="Min amount" />
        <input className="h-10 rounded-xl border px-3 text-sm font-semibold" inputMode="decimal" value={filters.amountMax} onChange={(event) => setFilters((current) => ({ ...current, amountMax: event.target.value }))} placeholder="Max amount" />
        <input className="h-10 rounded-xl border px-3 text-sm font-semibold" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search order, customer, waiter, table" />
      </CardContent></Card>
      {error ? <Card><CardContent className="p-5 text-sm font-semibold text-destructive">{error}</CardContent></Card> : null}
      <section className="dashboard-grid">
        <Metric title="Gross Revenue" value={formatCurrency(metrics.revenue)} note="Collected payments only" />
        <Metric title="Net Revenue" value={formatCurrency(metrics.netRevenue)} note="Revenue minus collected GST" />
        <Metric title="GST" value={formatCurrency(metrics.tax)} note="Collected-payment basis" />
        <Metric title="Tips" value={formatCurrency(metrics.tips)} note="Separated waiter money" />
        <Metric title="Pending Payments" value={formatCurrency(metrics.pending)} note="Uncollected balances" />
        <Metric title="Discounts / Offers" value={formatCurrency(metrics.discounts)} note="Order discounts" />
        <Metric title="Orders" value={String(rows.length)} note={`${metrics.paidOrders} paid · ${metrics.cancelled} cancelled`} />
        <Metric title="Average Order Value" value={formatCurrency(metrics.aov)} note="Paid revenue / paid orders" />
      </section>
      <AdvancedDataTable title={loading ? "Loading payment-based reports" : "Payment reconciliation report"} columns={columns} rows={rows} exportFilename="payment-reconciliation-report.csv" />
    </div>
  );
}

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-black uppercase text-muted-foreground">{label}<select className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold text-foreground" value={value} onChange={(event) => onChange(event.target.value)}>{values.map((item) => <option key={item} value={item}>{item === "all" ? `All ${label}` : item.toUpperCase()}</option>)}</select></label>;
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return <Card><CardContent className="p-5"><p className="text-sm font-bold text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-black">{value}</p><p className="mt-1 text-sm text-muted-foreground">{note}</p></CardContent></Card>;
}

function rangeFor(preset: Preset) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setHours(0, 0, 0, 0);
  if (preset === "last7") from.setDate(from.getDate() - 6);
  if (preset === "last30") from.setDate(from.getDate() - 29);
  return { from, to };
}

function orderInRange(order: Order, range: { from: Date; to: Date }) {
  const created = Date.parse(order.createdAt ?? "");
  return Number.isFinite(created) && created >= range.from.getTime() && created <= range.to.getTime();
}

function reportOrderFromLive(order: Order): Order {
  return { ...order, customerName: order.customerName ?? order.customer?.name, customerPhone: order.customerPhone ?? order.customer?.phone, subtotal: Number(order.subtotal ?? order.totals?.subtotal ?? 0), discount: Number(order.discount ?? order.totals?.discount ?? 0), tax: Number(order.tax ?? order.totals?.tax ?? 0), total: Number(order.total ?? order.totals?.total ?? 0), paidAmount: Number(order.paidAmount ?? (order.paymentStatus === "paid" ? order.total ?? order.totals?.total ?? 0 : 0)), tipAmount: Number(order.tipAmount ?? 0) };
}

function filteredOrders(orders: Order[], filters: Filters) {
  const search = filters.search.trim().toLowerCase();
  const min = Number(filters.amountMin);
  const max = Number(filters.amountMax);
  return orders
    .filter((order) => filters.status === "all" || String(order.status ?? "") === filters.status)
    .filter((order) => filters.payment === "all" || String(order.paymentStatus ?? "pending") === filters.payment)
    .filter((order) => filters.method === "all" || String(order.payment ?? "").toLowerCase() === filters.method || String(order.tipMethod ?? "").toLowerCase() === filters.method)
    .filter((order) => filters.channel === "all" || [order.fulfillmentType, order.orderType, order.channel].some((value) => String(value ?? "").toLowerCase() === filters.channel))
    .filter((order) => filters.tip === "all" || (filters.tip === "with-tip" ? tipAmount(order) > 0 : tipAmount(order) <= 0))
    .filter((order) => !Number.isFinite(min) || paidAmount(order) >= min)
    .filter((order) => !Number.isFinite(max) || paidAmount(order) <= max)
    .filter((order) => filters.waiter === "all" || String(order.waiterName ?? order.tipWaiterName ?? "unassigned").toLowerCase().includes(filters.waiter))
    .filter((order) => !search || [order.id, order.customerName, order.customerPhone, order.waiterName, order.tipWaiterName, order.cashierName, order.tableNumber, order.status, order.paymentStatus].some((value) => String(value ?? "").toLowerCase().includes(search)));
}

function summarizeReports(current: Analytics, orders: Order[]): Analytics {
  const metrics = summarizeRows(orders);
  return { ...current, orders, orderCount: orders.length, billableOrderCount: orders.filter((order) => !["cancelled", "rejected"].includes(String(order.status ?? ""))).length, revenue: metrics.revenue, grossRevenue: metrics.revenue, netRevenue: metrics.netRevenue, tips: metrics.tips, tax: metrics.tax, pendingPayments: metrics.pending, discounts: metrics.discounts, refunds: metrics.refunds };
}

function summarizeRows(orders: Order[]) {
  const billable = orders.filter((order) => !["cancelled", "rejected"].includes(String(order.status ?? "")));
  const revenue = round(billable.reduce((sum, order) => sum + paidAmount(order), 0));
  const tax = round(billable.reduce((sum, order) => sum + paidTaxAmount(order), 0));
  const paidOrders = billable.filter((order) => paidAmount(order) > 0).length;
  return {
    revenue,
    netRevenue: Math.max(0, round(revenue - tax)),
    tax,
    tips: round(billable.reduce((sum, order) => sum + tipAmount(order), 0)),
    pending: round(billable.reduce((sum, order) => sum + Math.max(0, Number(order.total ?? 0) - paidAmount(order)), 0)),
    discounts: round(billable.reduce((sum, order) => sum + Number(order.discount ?? 0), 0)),
    refunds: round(orders.filter((order) => order.paymentStatus === "refunded").reduce((sum, order) => sum + Number(order.total ?? 0), 0)),
    paidOrders,
    cancelled: orders.filter((order) => ["cancelled", "rejected"].includes(String(order.status ?? ""))).length,
    aov: paidOrders ? round(revenue / paidOrders) : 0,
  };
}

function paidAmount(order: Order) {
  const value = Number(order.paidAmount);
  return Number.isFinite(value) ? value : order.paymentStatus === "paid" ? Number(order.total ?? 0) : 0;
}

function tipAmount(order: Order) {
  const value = Number(order.tipAmount);
  return Number.isFinite(value) ? value : 0;
}

function paidTaxAmount(order: Order) {
  const total = Number(order.total ?? 0);
  const tax = Number(order.tax ?? 0);
  if (total <= 0 || tax <= 0) return 0;
  return round(tax * Math.min(1, paidAmount(order) / total));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function exportRows(rows: Array<Record<string, unknown>>) {
  const csv = [["Order", "Date", "Customer", "Waiter", "Status", "Payment", "Revenue", "Tips", "GST", "Pending"], ...rows.map((row) => [row.id, row.date, row.customerLabel, row.waiter, row.status, row.paymentStatus, row.paid, row.tip, row.tax, row.pending])].map((row) => row.map((cell) => JSON.stringify(cell ?? "")).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  link.download = "payment-reconciliation-report.csv";
  link.click();
}
