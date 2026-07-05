"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Eye,
  Globe2,
  IndianRupee,
  Mail,
  PackageCheck,
  Phone,
  ReceiptText,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Timer,
  Truck,
  Utensils,
  Users,
  X,
} from "lucide-react";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { OrderCard, type OpsOrder } from "@/components/orders/order-card";
import { OrderFilters } from "@/components/orders/order-filters";
import { IntegrationDialog } from "@/components/orders/integration-dialog";
import { OrderMetricCard } from "@/components/orders/metric-card";
import { PartnerCard } from "@/components/orders/partner-card";
import { parseFirestoreDateIso } from "@/lib/firestore-date";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showSarvaNotification } from "@/components/ui/app-toaster";
import { useAlert } from "@/hooks/useAlert";
import { actualOrderTime, readableOrderId, readableTableOrderId, relativeOrderTime } from "@/lib/order-display";
import { getKitchenDelay, type DelayPriority } from "@/lib/kitchen-delay";
import { normalizePhone } from "@/services/restaurant-ops-service";
import type { CateringQuote, DemoOrder, OrderChannel, OrderStatus, TableOrder, TableOrderStatus } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import type { OrderDoc } from "@/types/firebase";

type OrderTab = "live" | "scheduled" | "kot" | "completed" | "all";
type SourceFilter = "all" | "website" | "pos" | "zomato" | "swiggy" | "dine-in" | "parcel" | "catering";
type DatePreset = "today" | "yesterday" | "last7" | "week" | "last30" | "month" | "custom";
type DateRange = { preset: DatePreset; from: string; to: string };
type ActiveOpsOrder = OpsOrder & {
  createdAtMs: number;
  etaLabel: string;
  kitchenStatus: string;
  paymentStatusLabel: string;
  priorityLabel: string;
  isOnline: boolean;
  kitchenOrder?: TableOrder;
};

const dateRangeSessionKey = "sarva-owner-orders-date-range:v1";
const operationsPanelStorageKey = "sarva-owner-orders-operations-panel:v1";

const nextKitchenStatus: Record<TableOrderStatus, TableOrderStatus> = {
  new: "accepted",
  occupied: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  served: "completed",
  completed: "completed",
  cancelled: "cancelled",
  billed: "completed",
};

export function OwnerOrderManagementFlow() {
  const alert = useAlert();
  const [tab, setTab] = useState<OrderTab>("live");
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(() => readSessionDateRange());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [autoAccept, setAutoAccept] = useState(false);
  const [dialogPartner, setDialogPartner] = useState("");
  const [operationsOpen, setOperationsOpen] = useState(() => readStoredBoolean(operationsPanelStorageKey, false));
  const [highlightedOrderIds, setHighlightedOrderIds] = useState<Set<string>>(() => new Set());
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const knownNewOrders = useRef<Set<string> | null>(null);
  const cateringInquiries = useMemo<CateringQuote[]>(() => [], []);
  const rangeLabel = useMemo(() => formatRangeLabel(dateRange), [dateRange]);
  const mappedOrders = useMemo(() => buildOpsOrders(orders, tableOrders, now), [now, orders, tableOrders]);
  const tabOrders = useMemo(() => mappedOrders.filter((order) => matchesTab(order, tab)), [mappedOrders, tab]);
  const tabCatering = useMemo(() => cateringInquiries.filter((quote) => matchesCateringTab(quote, tab)), [cateringInquiries, tab]);
  const visibleOrders = useMemo(() => tabOrders.filter((order) => matchesFilter(order, filter) && matchesSearch(order, search)), [filter, search, tabOrders]);
  const visibleCatering = useMemo(() => tabCatering.filter((quote) => (filter === "all" || filter === "catering") && matchesCateringSearch(quote, search)), [filter, search, tabCatering]);
  const activeOrders = useMemo(() => visibleOrders.filter(isActiveOpsOrder).sort(newestFirst), [visibleOrders]);
  const metrics = useMemo(() => buildOrderMetrics(mappedOrders, tableOrders, cateringInquiries), [cateringInquiries, mappedOrders, tableOrders]);
  const filters = useMemo(() => buildFilters(tabOrders, tabCatering), [tabCatering, tabOrders]);
  const activeView = tab === "live";

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    writeStoredBoolean(operationsPanelStorageKey, operationsOpen);
  }, [operationsOpen]);

  useEffect(() => {
    writeSessionDateRange(dateRange);
    const controller = new AbortController();
    const query = dateRangeQuery(dateRange);
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setLoadError("");
    });
    void Promise.all([
      fetch(`/api/owner/orders?${query}`, { cache: "no-store", signal: controller.signal }).then((response) => readOwnerPayload<{ data?: OrderDoc[] }>(response, "Orders could not be loaded.")),
      fetch(`/api/owner/kitchen?${query}`, { cache: "no-store", signal: controller.signal }).then((response) => readOwnerPayload<{ data?: TableOrder[] }>(response, "Kitchen orders could not be loaded.")),
    ])
      .then(([ordersPayload, kitchenPayload]) => {
        if (controller.signal.aborted) return;
        setOrders((ordersPayload.data ?? []).map(toDemoOrder));
        setTableOrders(kitchenPayload.data ?? []);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        const message = reason instanceof Error ? reason.message : "Orders could not be loaded.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [dateRange]);

  const updateOrder = useCallback(async (orderId: string, status: OrderStatus, note?: string) => {
    const response = await fetch("/api/owner/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status, note }),
    });
    if (!response.ok) {
      toast.error("Order status could not be updated.");
      return false;
    }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    toast.success(orderStatusToast(status));
    return true;
  }, []);

  const focusOrder = useCallback((order: ActiveOpsOrder) => {
    setTab("live");
    setFilter("all");
    setSearch(order.displayId ?? order.id);
    setHighlightedOrderIds((current) => new Set(current).add(order.id));
    window.setTimeout(() => {
      setHighlightedOrderIds((current) => {
        const next = new Set(current);
        next.delete(order.id);
        return next;
      });
    }, 9000);
  }, []);

  const rejectOrder = useCallback(async (order: ActiveOpsOrder) => {
    const firstConfirm = await alert.confirm(`Reject ${order.displayId ?? order.id}?`, {
      title: "Reject order",
      content: "This will remove the order from Active Orders after the final confirmation.",
      confirmText: "Continue",
      confirmVariant: "danger",
      tone: "warning",
    });
    if (!firstConfirm) return false;
    const reason = await alert.prompt("Enter the rejection reason.", {
      title: "Reject reason",
      inputLabel: "Reason",
      placeholder: "Example: Item unavailable",
      confirmText: "Review rejection",
      tone: "warning",
    });
    const note = reason?.trim();
    if (!note) return false;
    const finalConfirm = await alert.confirm(`Reject ${order.displayId ?? order.id} for: ${note}?`, {
      title: "Final confirmation",
      confirmText: "Reject order",
      confirmVariant: "danger",
      tone: "danger",
    });
    if (!finalConfirm) return false;
    return updateOrder(order.id, "rejected", note);
  }, [alert, updateOrder]);

  async function rejectKitchenOrder(order: ActiveOpsOrder) {
    if (!order.kitchenOrder) return rejectOrder(order);
    const firstConfirm = await alert.confirm(`Reject ${order.displayId ?? order.id}?`, {
      title: "Reject kitchen ticket",
      content: "This keeps the action deliberate and records the kitchen ticket as cancelled.",
      confirmText: "Continue",
      confirmVariant: "danger",
      tone: "warning",
    });
    if (!firstConfirm) return false;
    const reason = await alert.prompt("Enter the rejection reason.", {
      title: "Reject reason",
      inputLabel: "Reason",
      placeholder: "Example: Duplicate ticket",
      confirmText: "Review rejection",
      tone: "warning",
    });
    if (!reason?.trim()) return false;
    const finalConfirm = await alert.confirm(`Reject ${order.displayId ?? order.id} for: ${reason.trim()}?`, {
      title: "Final confirmation",
      confirmText: "Reject ticket",
      confirmVariant: "danger",
      tone: "danger",
    });
    if (!finalConfirm) return false;
    await updateKitchenOrder(order.kitchenOrder, "cancelled");
    return true;
  }

  const notifyNewOrder = useCallback((order: ActiveOpsOrder) => {
    const id = `owner-new-order-${order.id}`;
    showSarvaNotification({
      id,
      tone: order.delay?.priority === "critical" ? "critical" : "info",
      title: `New order ${order.displayId ?? order.id}`,
      message: `${order.customer} · ${formatCurrency(order.total)} · ${order.itemCount} item${order.itemCount === 1 ? "" : "s"} · ${order.source}`,
      meta: order.tableNumber ? `Table ${order.tableNumber}` : order.type,
      duration: 12000,
      actions: [
        { label: "View", onClick: () => { focusOrder(order); toast.dismiss(id); } },
        { label: "Accept", variant: "primary", onClick: () => { void updateOrder(order.id, "accepted"); toast.dismiss(id); } },
        { label: "Reject", variant: "danger", onClick: () => { void rejectOrder(order); toast.dismiss(id); } },
      ],
    });
  }, [focusOrder, rejectOrder, updateOrder]);

  useEffect(() => {
    const incoming = activeOrders.filter((order) => order.status === "new" && order.isOnline && !order.kitchenOrder);
    const incomingIds = new Set(incoming.map((order) => order.id));
    if (!knownNewOrders.current) {
      knownNewOrders.current = incomingIds;
      return;
    }
    incoming.forEach((order) => {
      if (!knownNewOrders.current?.has(order.id)) {
        notifyNewOrder(order);
        setHighlightedOrderIds((current) => new Set(current).add(order.id));
        window.setTimeout(() => {
          setHighlightedOrderIds((current) => {
            const next = new Set(current);
            next.delete(order.id);
            return next;
          });
        }, 9000);
      }
    });
    knownNewOrders.current = incomingIds;
  }, [activeOrders, notifyNewOrder]);

  async function updateKitchenOrder(order: TableOrder, targetStatus?: TableOrderStatus) {
    const status = targetStatus ?? nextKitchenStatus[order.status];
    if (!status || status === order.status) return;
    const previous = tableOrders;
    setTableOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    const response = await fetch("/api/owner/kitchen", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: order.id, status }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({})) as { data?: TableOrder } | undefined;
    if (!response?.ok) {
      setTableOrders(previous);
      toast.error("Kitchen status could not be updated.");
      return;
    }
    if (payload?.data) setTableOrders((current) => current.map((item) => item.id === order.id ? payload.data! : item));
    toast.success(orderStatusToast(status));
  }

  async function updateCateringInquiryStatus() {
    toast.error("Catering requests are not part of the repository-backed order queue yet.");
  }

  async function convertCateringInquiryToOrder() {
    toast.error("Catering conversion is not part of the repository-backed order queue yet.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-950">Orders</h1>
          <p className="mt-2 text-base font-medium text-slate-600">Manage online orders from your website, POS, and delivery partners.</p>
          <p className="mt-2 text-sm font-black text-orange-600">{rangeLabel}</p>
        </div>
        <DateRangePicker key={`${dateRange.preset}:${dateRange.from}:${dateRange.to}`} open={datePickerOpen} range={dateRange} onChange={setDateRange} onOpenChange={setDatePickerOpen} />
      </div>
      {loadError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{loadError}</div> : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <OrderMetricCard label="New" value={String(metrics.newOrders)} note="New orders" icon={ShoppingBag} tone="purple" />
        <OrderMetricCard label="Preparing" value={String(metrics.preparing)} note="Being prepared" icon={ChefHat} tone="orange" />
        <OrderMetricCard label="Ready" value={String(metrics.ready)} note="Ready for pickup" icon={CheckCircle2} tone="green" />
        <OrderMetricCard label="Kitchen Tickets" value={String(metrics.kotTickets)} note="Sent to kitchen" icon={ClipboardList} tone="blue" />
        <OrderMetricCard label="Delayed" value={String(metrics.delayed)} note="Needs attention" icon={Bell} tone="red" />
        <OrderMetricCard label="Critical" value={String(metrics.critical)} note="Top priority" icon={ChefHat} tone="red" />
      </section>

      <div className={operationsOpen ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]" : "grid gap-6"}>
        <main className="space-y-5">
          <div className="flex flex-col gap-4 border-b border-neutral-200 pb-0 lg:flex-row lg:items-end lg:justify-between">
            <Tabs value={tab} onValueChange={(value) => setTab(value as OrderTab)}>
              <TabsList className="customer-scroll h-auto justify-start overflow-x-auto rounded-none bg-transparent p-0">
                {(["live", "scheduled", "kot", "completed", "all"] as const).map((item) => (
                  <TabsTrigger key={item} value={item} className="rounded-none border-b-2 border-transparent px-4 py-3 capitalize data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:shadow-none">
                    {item === "kot" ? "Kitchen" : item === "all" ? "All Orders" : item}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-3 pb-3">
              <span className="text-sm font-black text-neutral-950">Auto-accept</span>
              <button
                type="button"
                onClick={() => setAutoAccept((value) => !value)}
                title="Quickly pause or resume auto-accept. Configure rules in Settings."
                className={autoAccept ? "h-7 w-12 rounded-full bg-orange-500 p-1" : "h-7 w-12 rounded-full bg-slate-300 p-1"}
                aria-pressed={autoAccept}
              >
                <span className={autoAccept ? "block size-5 translate-x-5 rounded-full bg-white transition" : "block size-5 rounded-full bg-white transition"} />
              </button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/owner/settings">
                  <Settings className="size-4" />
                  Settings
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setOperationsOpen((value) => !value)}>
                <Settings className="size-4" />
                {operationsOpen ? "Hide panel" : "Operations panel"}
              </Button>
            </div>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-950 outline-none focus:border-orange-400" placeholder="Search orders, customers, phones, dates" aria-label="Search orders" />
          </label>

          <OrderFilters filters={filters} active={filter} onChange={setFilter} />

          <div className="space-y-4">
            {visibleCatering.length ? (
              <CateringInquiryList
                inquiries={visibleCatering}
                onStatus={updateCateringInquiryStatus}
                onConvert={convertCateringInquiryToOrder}
              />
            ) : null}
            {activeView ? (
              <ActiveOrdersGrid
                orders={activeOrders}
                highlightedOrderIds={highlightedOrderIds}
                onAccept={(order) => order.kitchenOrder ? void updateKitchenOrder(order.kitchenOrder, "accepted") : void updateOrder(order.id, "accepted")}
                onReject={(order) => void rejectKitchenOrder(order)}
                onReady={(order) => order.kitchenOrder ? void updateKitchenOrder(order.kitchenOrder, "ready") : void updateOrder(order.id, "ready")}
                onComplete={(order) => order.kitchenOrder ? void updateKitchenOrder(order.kitchenOrder, "completed") : void updateOrder(order.id, "delivered")}
                onView={focusOrder}
              />
            ) : visibleOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={() => order.kitchenOrder ? void updateKitchenOrder(order.kitchenOrder, "accepted") : void updateOrder(order.id, "accepted")}
                  onReject={() => void rejectKitchenOrder(order)}
                  onReady={() => order.kitchenOrder ? void updateKitchenOrder(order.kitchenOrder, "ready") : void updateOrder(order.id, "ready")}
                  onComplete={() => order.kitchenOrder ? void updateKitchenOrder(order.kitchenOrder, "completed") : void updateOrder(order.id, "delivered")}
                />
              ))}
            {tab === "kot" ? <KitchenCards orders={tableOrders} onNext={(order) => void updateKitchenOrder(order)} /> : null}
            {!visibleOrders.length && !visibleCatering.length && tab !== "kot" && !activeView ? <EmptyOrders /> : null}
            {activeView && !activeOrders.length && !visibleCatering.length ? <EmptyOrders title="No active orders" /> : null}
            {loading ? <p className="text-sm font-bold text-slate-500">Loading canonical orders...</p> : null}
          </div>
        </main>

        {operationsOpen ? (
        <aside className="space-y-5">
          <DashboardCard title="Delivery Partner Integrations">
            <p className="mb-4 text-sm text-slate-600">Connect and manage delivery partner accounts.</p>
            <div className="space-y-3">
              {["Zomato", "Swiggy", "Dunzo", "Porter", "Rapido", "Shadowfax"].map((partner, index) => (
                <PartnerCard
                  key={partner}
                  name={partner}
                  connected={index < 2}
                  status={index < 2 ? "connected" : index === 2 ? "sync-failed" : "disconnected"}
                  lastSync={index < 2 ? "2 min ago" : "Not connected"}
                  onConfigure={() => setDialogPartner(partner)}
                />
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Order Alerts & Sound">
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white text-orange-600 shadow-sm">
                  <Bell className="size-5" />
                </span>
                <div>
                  <p className="font-black text-slate-950">Sound settings moved to Settings</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Configure loud online alerts, kitchen sounds, waiter order sounds, repeat count, and test sounds from one place.</p>
                </div>
              </div>
              <Button className="mt-4 w-full" variant="outline" asChild>
                <Link href="/owner/settings">Open Notification & Sound</Link>
              </Button>
            </div>
          </DashboardCard>

          <DashboardCard title="Order Settings">
            <SettingRow label="Auto accept orders" value={autoAccept ? "Enabled" : "Disabled"} />
            <SettingRow label="Configuration" value="Settings → Order Automation" />
            <SettingRow label="Business hours" value="Configured" />
            <SettingRow label="Holiday mode" value="Off" />
          </DashboardCard>
        </aside>
        ) : null}
      </div>

      <IntegrationDialog partner={dialogPartner || "Partner"} open={Boolean(dialogPartner)} onOpenChange={(open) => !open && setDialogPartner("")} />
    </div>
  );
}

function DateRangePicker({ open, range, onChange, onOpenChange }: { open: boolean; range: DateRange; onChange: (range: DateRange) => void; onOpenChange: (open: boolean) => void }) {
  const [draftFrom, setDraftFrom] = useState(range.from);
  const [draftTo, setDraftTo] = useState(range.to);

  function applyCustom() {
    const from = draftFrom <= draftTo ? draftFrom : draftTo;
    const to = draftFrom <= draftTo ? draftTo : draftFrom;
    onChange({ preset: "custom", from, to });
    onOpenChange(false);
  }

  return (
    <div className="relative">
      <Button type="button" variant="outline" onClick={() => onOpenChange(!open)} aria-expanded={open} aria-haspopup="dialog">
        <CalendarClock className="size-4" />
        {formatRangeLabel(range)}
      </Button>
      {open ? (
        <section role="dialog" aria-label="Order date range" className="absolute right-0 z-40 mt-2 w-[min(92vw,28rem)] rounded-xl border bg-white p-3 shadow-2xl">
          <div className="grid gap-3 md:grid-cols-[10rem_1fr]">
            <div className="grid gap-1">
              {datePresets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    if (preset.key === "custom") {
                      onChange({ ...range, preset: "custom" });
                      return;
                    }
                    onChange(rangeForPreset(preset.key));
                    onOpenChange(false);
                  }}
                  className={range.preset === preset.key ? "rounded-lg bg-orange-50 px-3 py-2 text-left text-sm font-black text-orange-700" : "rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50"}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid content-start gap-3 rounded-lg border bg-slate-50 p-3">
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                From
                <input type="date" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold text-slate-950" />
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                To
                <input type="date" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold text-slate-950" />
              </label>
              <Button type="button" onClick={applyCustom}>Apply Custom Range</Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ActiveOrdersGrid({
  orders,
  highlightedOrderIds,
  onAccept,
  onReject,
  onReady,
  onComplete,
  onView,
}: {
  orders: ActiveOpsOrder[];
  highlightedOrderIds: Set<string>;
  onAccept: (order: ActiveOpsOrder) => void;
  onReject: (order: ActiveOpsOrder) => void;
  onReady: (order: ActiveOpsOrder) => void;
  onComplete: (order: ActiveOpsOrder) => void;
  onView: (order: ActiveOpsOrder) => void;
}) {
  const visible = orders.slice(0, 30);
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {visible.map((order) => (
        <ActiveOrderCard
          key={order.id}
          order={order}
          highlighted={highlightedOrderIds.has(order.id)}
          onAccept={() => onAccept(order)}
          onReject={() => onReject(order)}
          onReady={() => onReady(order)}
          onComplete={() => onComplete(order)}
          onView={() => onView(order)}
        />
      ))}
      {orders.length > visible.length ? <p className="rounded-xl border bg-white p-3 text-center text-sm font-bold text-slate-500 sm:col-span-2 xl:col-span-3 2xl:col-span-4">Showing latest {visible.length} active orders. Use search or filters for older active orders.</p> : null}
    </section>
  );
}

function ActiveOrderCard({
  order,
  highlighted,
  onAccept,
  onReject,
  onReady,
  onComplete,
  onView,
}: {
  order: ActiveOpsOrder;
  highlighted: boolean;
  onAccept: () => void;
  onReject: () => void;
  onReady: () => void;
  onComplete: () => void;
  onView: () => void;
}) {
  const delayed = Boolean(order.delay?.delayed);
  const critical = order.delay?.priority === "critical";
  const ready = order.status === "ready";
  const isNew = order.status === "new";
  const preparing = order.status === "accepted" || order.status === "preparing";
  return (
    <article className={cn("group min-h-[13rem] rounded-xl border bg-white p-3 shadow-sm transition", isNew && "border-orange-200 bg-orange-50/30 animate-pulse", delayed && "border-red-200 bg-gradient-to-br from-red-50 to-white", ready && "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-emerald-100", critical && "ring-2 ring-red-200", highlighted && "ring-2 ring-orange-400 ring-offset-2")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-slate-950">{order.displayId ?? order.id}</h3>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">{order.customer}</p>
        </div>
        <span className={cn("rounded-full px-2 py-1 text-[10px] font-black uppercase", statusTone(order.status))}>{order.status}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
        <InfoChip label="Source" value={order.source} />
        <InfoChip label="Table" value={order.tableNumber || order.type} />
        <InfoChip label="Amount" value={formatCurrency(order.total)} strong />
        <InfoChip label="Items" value={String(order.itemCount)} />
        <InfoChip label="Age" value={order.age} />
        <InfoChip label="ETA" value={order.etaLabel} />
        <InfoChip label="Payment" value={order.paymentStatusLabel} />
        <InfoChip label="Kitchen" value={order.kitchenStatus} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs font-black">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1", priorityTone(order.delay?.priority))}>
          {delayed || critical ? <AlertTriangle className="size-3.5" /> : <Timer className="size-3.5" />}
          {order.priorityLabel}
        </span>
        {delayed ? <span className="text-red-700">{order.delay?.lateMinutes}m late</span> : <span className="text-slate-500">{order.actualTime}</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {isNew ? (
          <>
            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={onAccept}><CheckCircle2 className="size-4" />Accept</Button>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={onReject}><X className="size-4" />Reject</Button>
          </>
        ) : null}
        {preparing ? <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={onReady}><CheckCircle2 className="size-4" />Ready</Button> : null}
        {ready ? <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={onComplete}><CheckCircle2 className="size-4" />Done</Button> : null}
        <Button size="sm" variant="outline" className={cn(!isNew && !preparing && !ready && "col-span-2")} onClick={onView}><Eye className="size-4" />View</Button>
      </div>
    </article>
  );
}

function InfoChip({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className="min-w-0 rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-slate-100">
      <span className="block text-[10px] font-black uppercase text-slate-400">{label}</span>
      <span className={cn("block truncate", strong ? "text-sm font-black text-slate-950" : "text-xs font-bold text-slate-700")}>{value || "-"}</span>
    </span>
  );
}

function KitchenCards({ orders, onNext }: { orders: TableOrder[]; onNext: (order: TableOrder) => void }) {
  const active = orders.filter((order) => !["completed", "billed"].includes(order.status));
  if (!active.length) return <EmptyOrders title="No active kitchen tickets" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {active.map((order, index) => (
        <DashboardCard key={order.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-black text-neutral-950">{readableTableOrderId(order, index + 1)}</p>
              <p className="text-sm text-slate-500">{relativeOrderTime(order.createdAt)} • {actualOrderTime(order.createdAt)} • {order.tableNumber} • {order.source}</p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{order.status}</span>
          </div>
          <div className="mt-4 space-y-2">
            {order.lines.map((line) => (
              <div key={line.itemId} className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                {line.quantity} x {line.name}
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full" onClick={() => onNext(order)} disabled={["completed", "billed"].includes(order.status)}>
            Mark {nextKitchenStatus[order.status]}
          </Button>
        </DashboardCard>
      ))}
    </div>
  );
}

function CateringInquiryList({
  inquiries,
  onStatus,
  onConvert,
}: {
  inquiries: CateringQuote[];
  onStatus: (quoteId: string, status: NonNullable<CateringQuote["status"]>) => Promise<void>;
  onConvert: (quoteId: string) => Promise<void>;
}) {
  const [draftTotals, setDraftTotals] = useState<Record<string, string>>({});

  async function sendRevisedQuote(quote: CateringQuote) {
    const amount = Number(draftTotals[quote.id] || quote.total || 0);
    if (!quote.email) {
      toast.error("Customer email is missing for this catering request.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter the revised quotation amount before sending.");
      return;
    }

    await onStatus(quote.id, "quoted");
    const subject = encodeURIComponent(`Revised catering quotation - ${quote.id}`);
    const body = encodeURIComponent([
      `Hello ${quote.name},`,
      "",
      "Thank you for your catering request with Nammude.",
      `Revised quotation: ${formatCurrency(amount)}`,
      `Guests: ${quote.guestCount}`,
      `Event: ${quote.eventType ?? "Catering event"}`,
      `Date and time: ${[quote.eventDate, quote.eventTime].filter(Boolean).join(" ") || "To be confirmed"}`,
      "",
      "Please reply to confirm or negotiate further.",
    ].join("\n"));
    window.location.assign(`mailto:${quote.email}?subject=${subject}&body=${body}`);
    toast.success("Revised quote marked and email draft opened.");
  }

  async function convertInquiry(quote: CateringQuote) {
    await onConvert(quote.id);
    toast.success("Catering request converted to an order.");
  }

  return (
    <div className="space-y-4">
      {inquiries.map((quote) => (
        <DashboardCard key={quote.id}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-orange-700">Catering</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-700">{quote.status ?? "new"}</span>
                <span className="text-sm font-black text-slate-950">{quote.id}</span>
              </div>
              <h3 className="mt-3 text-xl font-black text-slate-950">{quote.eventType || "Catering request"}</h3>
              <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                <span className="flex items-center gap-2"><Users className="size-4 text-orange-600" />{quote.guestCount} guests</span>
                <span className="flex items-center gap-2"><CalendarClock className="size-4 text-orange-600" />{[quote.eventDate, quote.eventTime].filter(Boolean).join(" • ") || "Date pending"}</span>
                <span className="flex items-center gap-2"><Phone className="size-4 text-orange-600" />{quote.phone}</span>
                <span className="flex items-center gap-2"><Mail className="size-4 text-orange-600" />{quote.email ?? "Email missing"}</span>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{quote.eventNotes}</p>
            </div>
            <div className="w-full shrink-0 rounded-2xl border border-slate-200 p-3 lg:w-72">
              <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                Revised quote amount
                <div className="flex items-center rounded-xl border border-slate-200 px-3">
                  <IndianRupee className="size-4 text-slate-400" />
                  <input
                    className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm font-bold outline-none"
                    inputMode="numeric"
                    value={draftTotals[quote.id] ?? (quote.total ? String(quote.total) : "")}
                    onChange={(event) => setDraftTotals((current) => ({ ...current, [quote.id]: event.target.value }))}
                    placeholder="Enter amount"
                  />
                </div>
              </label>
              <Button className="mt-3 w-full bg-orange-600 hover:bg-orange-700" onClick={() => void sendRevisedQuote(quote)}>
                <Send className="size-4" />
                Send quote by email
              </Button>
              <Button className="mt-2 w-full" variant="outline" disabled={quote.status === "converted"} onClick={() => void convertInquiry(quote)}>
                Convert to order
              </Button>
            </div>
          </div>
        </DashboardCard>
      ))}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-0">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="text-sm font-bold text-slate-500">{value}</span>
    </div>
  );
}

function EmptyOrders({ title = "No orders in this view" }: { title?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-10 text-center">
      <p className="font-black text-neutral-950">{title}</p>
      <p className="mt-2 text-sm text-slate-500">Incoming website, POS, scheduled, and partner orders will appear here.</p>
    </div>
  );
}

const datePresets: Array<{ key: DatePreset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 Days" },
  { key: "week", label: "This Week" },
  { key: "last30", label: "Last 30 Days" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom Range" },
];

function readSessionDateRange(): DateRange {
  if (typeof window === "undefined") return rangeForPreset("today");
  const saved = window.sessionStorage.getItem(dateRangeSessionKey);
  if (!saved) return rangeForPreset("today");
  try {
    const value = JSON.parse(saved) as DateRange;
    return value.from && value.to ? value : rangeForPreset("today");
  } catch {
    return rangeForPreset("today");
  }
}

function writeSessionDateRange(range: DateRange) {
  if (typeof window !== "undefined") window.sessionStorage.setItem(dateRangeSessionKey, JSON.stringify(range));
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return value === null ? fallback : value === "true";
}

function writeStoredBoolean(key: string, value: boolean) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, String(value));
}

function dateRangeQuery(range: DateRange) {
  const params = new URLSearchParams();
  params.set("from", range.from);
  params.set("to", range.to);
  params.set("limit", "300");
  return params.toString();
}

function rangeForPreset(preset: DatePreset): DateRange {
  const today = startOfDay(new Date());
  if (preset === "yesterday") {
    const date = addDays(today, -1);
    return { preset, from: inputDate(date), to: inputDate(date) };
  }
  if (preset === "last7") return { preset, from: inputDate(addDays(today, -6)), to: inputDate(today) };
  if (preset === "week") return { preset, from: inputDate(addDays(today, -today.getDay())), to: inputDate(addDays(today, 6 - today.getDay())) };
  if (preset === "last30") return { preset, from: inputDate(addDays(today, -29)), to: inputDate(today) };
  if (preset === "month") return { preset, from: inputDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: inputDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  return { preset, from: inputDate(today), to: inputDate(today) };
}

function formatRangeLabel(range: DateRange) {
  if (range.preset === "today" && range.from === range.to) return `Today • ${formatDisplayDate(range.from)}`;
  if (range.preset === "yesterday" && range.from === range.to) return `Yesterday • ${formatDisplayDate(range.from)}`;
  if (range.from === range.to) return formatDisplayDate(range.from);
  return `${formatDisplayDate(range.from)} → ${formatDisplayDate(range.to)}`;
}

function inputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : value;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function readOwnerPayload<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || fallback);
  return payload;
}

function buildOpsOrders(orders: DemoOrder[], tableOrders: TableOrder[], now: number): ActiveOpsOrder[] {
  const countByPhone = new Map<string, number>();
  for (const order of orders) {
    const phone = normalizePhone(order.customer.phone);
    if (phone) countByPhone.set(phone, (countByPhone.get(phone) ?? 0) + 1);
  }
  const customerOrders = orders.map((order, index) => {
    const delay = getKitchenDelay({ status: order.status, createdAt: order.createdAt, prepEstimateMinutes: order.prepEstimateMinutes });
    return {
      delay,
      id: order.id,
      displayId: readableOrderId({
        id: order.id,
        channel: order.channel,
        orderType: order.fulfillmentType,
        tableNumber: (order as { tableNumber?: string }).tableNumber,
        createdAt: order.createdAt,
        sequence: index + 1,
      }),
      age: relativeOrderTime(order.createdAt, now),
      actualTime: actualOrderTime(order.createdAt),
      source: sourceLabel(order.channel),
      customer: order.customer.name,
      phone: order.customer.phone,
      email: (order.customer as { email?: string }).email,
      address: order.customer.address,
      previousOrderCount: countByPhone.get(normalizePhone(order.customer.phone)) ?? 0,
      customerRating: (order.customer as { rating?: number }).rating,
      type: order.fulfillmentType ?? "delivery",
      tableNumber: (order as { tableNumber?: string }).tableNumber,
      status: order.status,
      itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
      total: order.totals.total,
      payment: order.payment === "cod" ? "Cash" : order.payment.toUpperCase(),
      instructions: order.statusNote,
      scheduledLabel: order.scheduledFor ? `Delivery at ${new Date(order.scheduledFor).toLocaleString("en-IN", { timeStyle: "short", dateStyle: "medium" })}` : undefined,
      prepSuggestion: order.scheduledFor ? prepStartSuggestion(order.scheduledFor, order.prepEstimateMinutes ?? 50) : undefined,
      createdAtMs: timestampMs(order.createdAt),
      etaLabel: `${order.prepEstimateMinutes ?? 30} min`,
      kitchenStatus: kitchenStatusLabel(order.status),
      paymentStatusLabel: paymentStatusLabel(order.paymentStatus),
      priorityLabel: priorityLabel(delay.priority),
      isOnline: !["POS", "Catering"].includes(sourceLabel(order.channel)),
    };
  });
  const kotOrders = tableOrders.map((order, index) => {
    const delay = getKitchenDelay(order, now);
    return {
      delay,
      id: order.id,
      displayId: readableTableOrderId(order, index + 1),
      age: relativeOrderTime(order.createdAt, now),
      actualTime: actualOrderTime(order.createdAt),
      source: order.source === "Delivery" ? "POS Delivery" : order.source === "Parcel" ? "POS Parcel" : "POS",
      customer: order.customerName ?? order.guestName ?? order.tableNumber,
      phone: order.customerPhone ?? "",
      address: order.deliveryAddress,
      previousOrderCount: 0,
      type: order.orderType ?? "dine-in",
      tableNumber: order.orderType === "dine-in" ? order.tableNumber : undefined,
      status: order.status === "served" ? "ready" : order.status,
      itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
      total: order.total ?? order.lines.reduce((sum, line) => sum + line.quantity * line.price, 0),
      payment: "Pending",
      scheduledLabel: order.scheduledFor ? `Delivery at ${new Date(order.scheduledFor).toLocaleString("en-IN", { timeStyle: "short", dateStyle: "medium" })}` : undefined,
      createdAtMs: timestampMs(order.createdAt),
      etaLabel: `${order.etaMinutes ?? 15} min`,
      kitchenStatus: kitchenStatusLabel(order.status),
      paymentStatusLabel: paymentStatusLabel(order.paymentStatus),
      priorityLabel: priorityLabel(delay.priority),
      isOnline: order.source === "QR" || order.source === "Waiter",
      kitchenOrder: order,
    };
  });
  return [...customerOrders, ...kotOrders].sort(newestFirst);
}

function buildOrderMetrics(orders: OpsOrder[], tableOrders: TableOrder[], cateringInquiries: CateringQuote[]) {
  return {
    newOrders: orders.filter((order) => order.status === "new").length + cateringInquiries.filter((quote) => (quote.status ?? "new") === "new").length,
    preparing: orders.filter((order) => ["accepted", "preparing", "occupied"].includes(order.status)).length,
    ready: orders.filter((order) => ["ready", "served"].includes(order.status)).length,
    kotTickets: tableOrders.filter((order) => !["completed", "billed"].includes(order.status)).length,
    delayed: orders.filter((order) => order.delay?.delayed).length,
    critical: orders.filter((order) => order.delay?.priority === "critical").length,
  };
}

function buildFilters(orders: OpsOrder[], cateringInquiries: CateringQuote[]) {
  const count = (predicate: (order: OpsOrder) => boolean) => orders.filter(predicate).length;
  return [
    { key: "all" as const, label: "All", icon: ClipboardList, count: orders.length + cateringInquiries.length },
    { key: "website" as const, label: "Website", icon: Globe2, count: count((order) => order.source === "Website") },
    { key: "pos" as const, label: "POS", icon: ReceiptText, count: count((order) => order.source.includes("POS")) },
    { key: "zomato" as const, label: "Zomato", icon: Utensils, count: count((order) => order.source === "Zomato") },
    { key: "swiggy" as const, label: "Swiggy", icon: Truck, count: count((order) => order.source === "Swiggy") },
    { key: "dine-in" as const, label: "Dine-in", icon: Utensils, count: count((order) => order.type === "dine-in") },
    { key: "parcel" as const, label: "Parcel", icon: PackageCheck, count: count((order) => order.type === "parcel") },
    { key: "catering" as const, label: "Catering", icon: CalendarClock, count: count((order) => order.source === "Catering") + cateringInquiries.length },
  ];
}

function matchesTab(order: OpsOrder, tab: OrderTab) {
  if (tab === "all") return true;
  if (tab === "scheduled") return Boolean(order.scheduledLabel) || order.source === "Catering";
  if (tab === "completed") return ["delivered", "completed", "cancelled", "rejected"].includes(order.status);
  if (tab === "kot") return false;
  return !["delivered", "completed", "cancelled", "rejected"].includes(order.status);
}

function matchesFilter(order: OpsOrder, filter: SourceFilter) {
  if (filter === "all") return true;
  if (filter === "website") return order.source === "Website";
  if (filter === "pos") return order.source.includes("POS");
  if (filter === "zomato") return order.source === "Zomato";
  if (filter === "swiggy") return order.source === "Swiggy";
  if (filter === "catering") return order.source === "Catering";
  return order.type === filter;
}

function matchesSearch(order: OpsOrder, query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return true;
  return [
    order.id,
    order.displayId,
    order.customer,
    order.phone,
    order.email,
    order.address,
    order.type,
    order.source,
    order.status,
    order.scheduledLabel,
  ].filter(Boolean).join(" ").toLowerCase().includes(search);
}

function matchesCateringSearch(quote: CateringQuote, query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return true;
  return [quote.id, quote.name, quote.phone, quote.email, quote.eventType, quote.eventDate, quote.eventTime].filter(Boolean).join(" ").toLowerCase().includes(search);
}

function matchesCateringTab(quote: CateringQuote, tab: OrderTab) {
  const status = quote.status ?? "new";
  if (tab === "all") return true;
  if (tab === "kot") return false;
  if (tab === "scheduled") return true;
  if (tab === "completed") return ["confirmed", "converted", "cancelled"].includes(status);
  return ["new", "contacted", "quoted"].includes(status);
}

function toDemoOrder(order: OrderDoc): DemoOrder {
  const demo: DemoOrder & { tableNumber?: string } = {
    id: order.id,
    restaurantSlug: order.restaurantId,
    customer: { name: order.customerName, phone: order.customerPhone, address: order.deliveryAddress ?? "" },
    lines: order.lines.map((line) => ({ itemId: line.menuItemId, name: line.name, price: line.price, quantity: line.quantity })),
    totals: { subtotal: order.subtotal, discount: order.discount, deliveryFee: order.deliveryFee, tax: order.tax, total: order.total },
    offerCode: order.offerCode,
    payment: "upi",
    paymentStatus: order.paymentStatus,
    channel: orderChannelLabel(order.channel),
    status: order.status === "cancelled" ? "rejected" : order.status === "served" ? "ready" : order.status === "completed" ? "delivered" : order.status,
    createdAt: formatFirestoreDateTime(order.createdAt) ?? new Date().toISOString(),
    deliveryOtp: order.deliveryOtp,
    kitchenOrderId: order.kitchenOrderId,
    statusNote: (order as { statusNote?: string }).statusNote,
    fulfillmentType: normalizeFulfillment(order.fulfillmentType ?? order.orderType),
    scheduleMode: order.scheduleMode,
    scheduledFor: formatFirestoreDateTime(order.scheduledFor),
    scheduledStatus: order.scheduledStatus,
    prepEstimateMinutes: order.prepEstimateMinutes,
    cutoffAt: formatFirestoreDateTime(order.cutoffAt),
    guestCount: order.guestCount,
    tableNumber: order.tableNumber,
  };
  return demo;
}

function orderChannelLabel(channel: OrderDoc["channel"]): OrderChannel {
  if (channel === "instagram") return "Instagram";
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "pos") return "POS";
  if (channel === "catering") return "Catering";
  if (channel === "qr") return "QR";
  return "Web";
}

function sourceLabel(channel: OrderChannel) {
  if (channel === "Web") return "Website";
  if (channel === "Catering") return "Catering";
  return channel;
}

function isActiveOpsOrder(order: ActiveOpsOrder) {
  return !["delivered", "completed", "cancelled", "rejected"].includes(order.status);
}

function newestFirst(first: ActiveOpsOrder, second: ActiveOpsOrder) {
  return second.createdAtMs - first.createdAtMs || statusRank(first.status) - statusRank(second.status);
}

function statusRank(status: string) {
  const rank = ["new", "accepted", "preparing", "ready", "served", "delivered", "completed", "rejected"].indexOf(status);
  return rank === -1 ? 99 : rank;
}

function timestampMs(value: string) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function kitchenStatusLabel(status?: string) {
  if (!status) return "Not sent";
  return status.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function paymentStatusLabel(status?: string) {
  if (!status) return "Pending";
  return kitchenStatusLabel(status);
}

function priorityLabel(priority?: DelayPriority) {
  if (priority === "critical") return "Critical";
  if (priority === "high") return "High priority";
  if (priority === "medium") return "Delayed";
  return "Normal";
}

function priorityTone(priority?: DelayPriority) {
  if (priority === "critical") return "bg-red-100 text-red-800";
  if (priority === "high") return "bg-orange-100 text-orange-800";
  if (priority === "medium") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function statusTone(status: string) {
  if (status === "new") return "bg-orange-100 text-orange-700";
  if (["accepted", "preparing"].includes(status)) return "bg-blue-100 text-blue-700";
  if (["ready", "served"].includes(status)) return "bg-emerald-100 text-emerald-700";
  if (["rejected", "cancelled"].includes(status)) return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function orderStatusToast(status: OrderStatus | TableOrderStatus) {
  if (status === "accepted") return "Order accepted.";
  if (status === "preparing") return "Cooking started.";
  if (status === "ready") return "Order ready.";
  if (status === "delivered" || status === "completed") return "Order completed.";
  if (status === "rejected" || status === "cancelled") return "Order cancelled.";
  return `Order moved to ${status}.`;
}

function prepStartSuggestion(value: string, prepMinutes: number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  date.setMinutes(date.getMinutes() - prepMinutes);
  return `Suggested prep start: ${date.toLocaleTimeString("en-IN", { timeStyle: "short" })}`;
}

function formatFirestoreDateTime(value: unknown) {
  return parseFirestoreDateIso(value);
}

function normalizeFulfillment(value?: string) {
  return value === "dine-in" || value === "parcel" || value === "delivery" ? value : "parcel";
}
