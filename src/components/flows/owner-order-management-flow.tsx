"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Globe2,
  IndianRupee,
  Mail,
  PackageCheck,
  Phone,
  ReceiptText,
  Send,
  Settings,
  ShoppingBag,
  Truck,
  Utensils,
  Users,
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
import { actualOrderTime, readableOrderId, readableTableOrderId, relativeOrderTime } from "@/lib/order-display";
import { normalizePhone } from "@/services/restaurant-ops-service";
import type { CateringQuote, DemoOrder, OrderChannel, OrderStatus, TableOrder, TableOrderStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import type { OrderDoc } from "@/types/firebase";

type OrderTab = "live" | "scheduled" | "kot" | "completed" | "all";
type SourceFilter = "all" | "website" | "pos" | "zomato" | "swiggy" | "dine-in" | "parcel" | "catering";

const nextKitchenStatus: Record<TableOrderStatus, TableOrderStatus> = {
  new: "accepted",
  occupied: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  served: "completed",
  completed: "completed",
  billed: "completed",
};

export function OwnerOrderManagementFlow() {
  const [tab, setTab] = useState<OrderTab>("all");
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [autoAccept, setAutoAccept] = useState(false);
  const [dialogPartner, setDialogPartner] = useState("");
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const cateringInquiries = useMemo<CateringQuote[]>(() => [], []);
  const mappedOrders = useMemo(() => buildOpsOrders(orders, tableOrders), [orders, tableOrders]);
  const tabOrders = mappedOrders.filter((order) => matchesTab(order, tab));
  const tabCatering = cateringInquiries.filter((quote) => matchesCateringTab(quote, tab));
  const visibleOrders = tabOrders.filter((order) => matchesFilter(order, filter));
  const visibleCatering = tabCatering.filter(() => filter === "all" || filter === "catering");
  const metrics = buildOrderMetrics(mappedOrders, tableOrders, cateringInquiries);
  const filters = buildFilters(tabOrders, tabCatering);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/owner/orders", { cache: "no-store" }).then((response) => response.json()) as Promise<{ data?: OrderDoc[] }>,
      fetch("/api/owner/kitchen", { cache: "no-store" }).then((response) => response.json()) as Promise<{ data?: TableOrder[] }>,
    ])
      .then(([ordersPayload, kitchenPayload]) => {
        if (!active) return;
        setOrders((ordersPayload.data ?? []).map(toDemoOrder));
        setTableOrders(kitchenPayload.data ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function updateOrder(orderId: string, status: OrderStatus) {
    const response = await fetch("/api/owner/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    if (!response.ok) {
      toast.error("Order status could not be updated.");
      return;
    }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
  }

  async function updateKitchenOrder(order: TableOrder) {
    const status = nextKitchenStatus[order.status];
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
  }

  async function updateCateringInquiryStatus() {
    toast.error("Catering requests are not part of the repository-backed order queue yet.");
  }

  async function convertCateringInquiryToOrder() {
    toast.error("Catering conversion is not part of the repository-backed order queue yet.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-neutral-950">Orders</h1>
        <p className="mt-2 text-base font-medium text-slate-600">Manage online orders from your website, POS, and delivery partners.</p>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <OrderMetricCard label="New" value={String(metrics.newOrders)} note="New orders" icon={ShoppingBag} tone="purple" />
        <OrderMetricCard label="Preparing" value={String(metrics.preparing)} note="Being prepared" icon={ChefHat} tone="orange" />
        <OrderMetricCard label="Ready" value={String(metrics.ready)} note="Ready for pickup" icon={CheckCircle2} tone="green" />
        <OrderMetricCard label="Kitchen Tickets" value={String(metrics.kotTickets)} note="Sent to kitchen" icon={ClipboardList} tone="blue" />
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

          <OrderFilters filters={filters} active={filter} onChange={setFilter} />

          <div className="space-y-4">
            {visibleCatering.length ? (
              <CateringInquiryList
                inquiries={visibleCatering}
                onStatus={updateCateringInquiryStatus}
                onConvert={convertCateringInquiryToOrder}
              />
            ) : null}
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={() => void updateOrder(order.id, "accepted")}
                onReject={() => void updateOrder(order.id, "rejected")}
                onReady={() => void updateOrder(order.id, "ready")}
                onComplete={() => void updateOrder(order.id, "delivered")}
              />
            ))}
            {tab === "kot" ? <KitchenCards orders={tableOrders} onNext={(order) => void updateKitchenOrder(order)} /> : null}
            {!visibleOrders.length && !visibleCatering.length && tab !== "kot" ? <EmptyOrders /> : null}
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

function buildOpsOrders(orders: DemoOrder[], tableOrders: TableOrder[]): OpsOrder[] {
  const countByPhone = new Map<string, number>();
  for (const order of orders) {
    const phone = normalizePhone(order.customer.phone);
    if (phone) countByPhone.set(phone, (countByPhone.get(phone) ?? 0) + 1);
  }
  const customerOrders = orders.map((order, index) => ({
    id: order.id,
    displayId: readableOrderId({
      id: order.id,
      channel: order.channel,
      orderType: order.fulfillmentType,
      tableNumber: (order as { tableNumber?: string }).tableNumber,
      createdAt: order.createdAt,
      sequence: index + 1,
    }),
    age: relativeOrderTime(order.createdAt),
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
  }));
  const kotOrders = tableOrders.map((order, index) => ({
    id: order.id,
    displayId: readableTableOrderId(order, index + 1),
    age: relativeOrderTime(order.createdAt),
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
  }));
  return [...customerOrders, ...kotOrders].sort((first, second) => orderRank(first.status) - orderRank(second.status));
}

function buildOrderMetrics(orders: OpsOrder[], tableOrders: TableOrder[], cateringInquiries: CateringQuote[]) {
  return {
    newOrders: orders.filter((order) => order.status === "new").length + cateringInquiries.filter((quote) => (quote.status ?? "new") === "new").length,
    preparing: orders.filter((order) => ["accepted", "preparing", "occupied"].includes(order.status)).length,
    ready: orders.filter((order) => ["ready", "served"].includes(order.status)).length,
    kotTickets: tableOrders.filter((order) => !["completed", "billed"].includes(order.status)).length,
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

function matchesCateringTab(quote: CateringQuote, tab: OrderTab) {
  const status = quote.status ?? "new";
  if (tab === "all") return true;
  if (tab === "kot") return false;
  if (tab === "scheduled") return true;
  if (tab === "completed") return ["confirmed", "converted", "cancelled"].includes(status);
  return ["new", "contacted", "quoted"].includes(status);
}

function toDemoOrder(order: OrderDoc): DemoOrder {
  return {
    id: order.id,
    restaurantSlug: order.restaurantId,
    customer: { name: order.customerName, phone: order.customerPhone, address: order.deliveryAddress ?? "" },
    lines: order.lines.map((line) => ({ itemId: line.menuItemId, name: line.name, price: line.price, quantity: line.quantity })),
    totals: { subtotal: order.subtotal, discount: order.discount, deliveryFee: order.deliveryFee, tax: order.tax, total: order.total },
    offerCode: order.offerCode,
    payment: "upi",
    channel: order.channel === "instagram" ? "Instagram" : order.channel === "whatsapp" ? "WhatsApp" : "Web",
    status: order.status === "cancelled" ? "rejected" : order.status === "served" ? "ready" : order.status === "completed" ? "delivered" : order.status,
    createdAt: formatFirestoreDateTime(order.createdAt) ?? new Date().toISOString(),
    deliveryOtp: order.deliveryOtp,
    fulfillmentType: normalizeFulfillment(order.fulfillmentType ?? order.orderType),
    scheduleMode: order.scheduleMode,
    scheduledFor: formatFirestoreDateTime(order.scheduledFor),
    scheduledStatus: order.scheduledStatus,
    prepEstimateMinutes: order.prepEstimateMinutes,
    cutoffAt: formatFirestoreDateTime(order.cutoffAt),
    guestCount: order.guestCount,
  };
}

function sourceLabel(channel: OrderChannel) {
  if (channel === "Web") return "Website";
  if (channel === "Catering") return "Catering";
  return channel;
}

function orderRank(status: string) {
  return ["new", "accepted", "preparing", "ready", "served", "delivered", "completed", "rejected"].indexOf(status);
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
