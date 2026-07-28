"use client";

import { useEffect, useMemo, useState } from "react";
import { History, IndianRupee, Star, Users } from "lucide-react";
import { usePersistedOrderFilter } from "@/hooks/use-persisted-order-filter";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { CompactOrderAccordion } from "@/components/orders/CompactOrderAccordion";
import { OrderClassificationBar } from "@/components/orders/order-classification-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildOrderClassificationOptions, buildOrderOperationOptions, filterOrdersByClassification, filterOrdersByOperation, orderClassificationIds, orderOperationIds, type OrderClassificationId, type OrderOperationId } from "@/lib/order-classification";
import { formatCurrency } from "@/lib/utils";
import type { OrderBadgeTone } from "@/components/orders/OrderAccordion.types";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalOrders: number;
  lifetimeValue: number;
  loyaltyPoints: number;
  tier: string;
  favoriteItems?: string[];
  lastOrderAt?: string;
};

type Detail = { customer: Customer; orders: Array<{ id: string; total?: number; status?: string; createdAt?: string; source?: string; orderType?: string; fulfillmentType?: string; scheduledFor?: string; lines?: Array<{ name: string }> }>; loyalty: { points?: number; tier?: string } };

export default function OwnerCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/owner/customers", { cache: "no-store", signal: controller.signal });
        const payload = await response.json().catch(() => ({})) as { data?: Customer[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Customers could not be loaded.");
        setCustomers(payload.data ?? []);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Customers could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDetailLoading(true);
      setError("");
      void (async () => {
        try {
          const response = await fetch(`/api/owner/customers?id=${encodeURIComponent(selectedId)}`, { cache: "no-store", signal: controller.signal });
          const payload = await response.json().catch(() => ({})) as { data?: Detail; error?: string };
          if (!response.ok) throw new Error(payload.error || "Customer profile could not be loaded.");
          setDetail(payload.data ?? null);
        } catch (reason) {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
          setError(reason instanceof Error ? reason.message : "Customer profile could not be loaded.");
          setDetail(null);
        } finally {
          if (!controller.signal.aborted) setDetailLoading(false);
        }
      })();
    }, 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [selectedId]);

  const totals = useMemo(() => ({
    spend: customers.reduce((sum, customer) => sum + Number(customer.lifetimeValue ?? 0), 0),
    points: customers.reduce((sum, customer) => sum + Number(customer.loyaltyPoints ?? 0), 0),
  }), [customers]);
  const columns: AdvancedColumn<Customer>[] = [
    { key: "name", label: "Customer" },
    { key: "phone", label: "Phone" },
    { key: "totalOrders", label: "Visits", align: "right" },
    { key: "lifetimeValue", label: "Total spend", align: "right", render: (row) => formatCurrency(row.lifetimeValue), exportValue: (row) => row.lifetimeValue },
    { key: "loyaltyPoints", label: "Points", align: "right" },
    { key: "tier", label: "Tier", render: (row) => <Badge variant={row.tier === "VIP" || row.tier === "Gold" ? "success" : "muted"}>{row.tier}</Badge> },
    { key: "id", label: "", sortable: false, render: (row) => <Button size="sm" variant="outline" onClick={() => { setDetail(null); setSelectedId(row.id); }}>Profile</Button> },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Customers" description="Canonical customer records, spend, visits, loyalty, wallet points, favorite items, and order history." />
      <section className="dashboard-grid">
        <Metric icon={<Users className="size-5" />} title="Customers" value={String(customers.length)} />
        <Metric icon={<IndianRupee className="size-5" />} title="Lifetime spend" value={formatCurrency(totals.spend)} />
        <Metric icon={<Star className="size-5" />} title="Loyalty points" value={String(totals.points)} />
      </section>
      {error ? <Card><CardContent className="p-5 text-sm font-semibold text-destructive">{error}</CardContent></Card> : null}
      <AdvancedDataTable title={loading ? "Loading customers" : "Customer CRM"} columns={columns} rows={customers} searchPlaceholder="Search customer name or phone" exportFilename="customers.csv" />
      {detailLoading ? <Card><CardContent className="p-5 text-sm font-semibold text-muted-foreground">Loading customer profile...</CardContent></Card> : null}
      {detail ? <CustomerProfile detail={detail} onClose={() => { setDetail(null); setSelectedId(""); }} /> : null}
    </div>
  );
}

function CustomerProfile({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const { customer, orders, loyalty } = detail;
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [classification, setClassification] = usePersistedOrderFilter<OrderClassificationId>("sarva.orderFilters.customers.primary", "all", orderClassificationIds);
  const [operation, setOperation] = usePersistedOrderFilter<OrderOperationId>("sarva.orderFilters.customers.operation", "all", orderOperationIds);
  const classificationOptions = useMemo(() => buildOrderClassificationOptions(orders, { includeZero: true }), [orders]);
  const primaryOrders = useMemo(() => filterOrdersByClassification(orders, classification), [classification, orders]);
  const operationOptions = useMemo(() => buildOrderOperationOptions(primaryOrders, { includeZero: true }), [primaryOrders]);
  const visibleOrders = useMemo(() => filterOrdersByOperation(primaryOrders, operation), [operation, primaryOrders]);
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-lg font-black">{customer.name}</p><p className="text-sm text-muted-foreground">{customer.phone} {customer.email ? `· ${customer.email}` : ""}</p></div>
          <Button variant="outline" onClick={onClose}>Close profile</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <ProfileValue label="Visits" value={String(customer.totalOrders)} />
          <ProfileValue label="Spend" value={formatCurrency(customer.lifetimeValue)} />
          <ProfileValue label="Points" value={String(loyalty.points ?? customer.loyaltyPoints)} />
          <ProfileValue label="Tier" value={String(loyalty.tier ?? customer.tier)} />
        </div>
        <div><p className="text-sm font-black">Favorite items</p><p className="mt-1 text-sm text-muted-foreground">{customer.favoriteItems?.join(", ") || "No order history yet"}</p></div>
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-black"><History className="size-4" />Order history</p>
          <OrderClassificationBar value={classification} options={classificationOptions} onChange={setClassification} />
          <OrderClassificationBar value={operation} options={operationOptions} onChange={setOperation} label="Operational state" />
          {visibleOrders.length ? visibleOrders.slice(0, 10).map((order) => (
            <CompactOrderAccordion
              key={order.id}
              id={`customer-order-${order.id}`}
              orderNumber={order.id}
              etaLabel={formatProfileOrderTime(order.createdAt)}
              orderTypeLabel="Customer"
              itemCountLabel={`${order.lines?.length ?? 0} item${order.lines?.length === 1 ? "" : "s"}`}
              status={{ label: order.status ?? "Order", tone: customerOrderStatusTone(order.status) }}
              badges={[{ label: formatCurrency(Number(order.total ?? 0)), tone: "muted" }]}
              items={(order.lines?.length ? order.lines : [{ name: "Order" }]).map((line, index) => ({
                id: `${order.id}-${index}`,
                name: line.name,
                quantity: 1,
              }))}
              facts={[
                { label: "Customer", value: customer.name },
                { label: "Phone", value: customer.phone },
                { label: "Created", value: formatProfileOrderTime(order.createdAt) },
                { label: "Total", value: formatCurrency(Number(order.total ?? 0)) },
              ]}
              isOpen={expandedOrderId === order.id}
              onOpenChange={(open) => setExpandedOrderId(open ? order.id : null)}
            />
          )) : <p className="text-sm text-muted-foreground">No orders match this classification.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function customerOrderStatusTone(status?: string): OrderBadgeTone {
  if (["completed", "delivered", "paid"].includes(String(status))) return "success";
  if (["cancelled", "rejected", "failed"].includes(String(status))) return "danger";
  if (["new", "pending"].includes(String(status))) return "warning";
  return "muted";
}

function formatProfileOrderTime(value?: string) {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : value;
}

function Metric({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return <Card><CardContent className="p-5">{icon}<p className="mt-3 text-sm font-bold text-muted-foreground">{title}</p><p className="mt-1 text-3xl font-black">{value}</p></CardContent></Card>;
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}
