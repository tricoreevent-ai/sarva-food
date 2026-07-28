"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  CalendarPlus,
  ChefHat,
  CreditCard,
  GripVertical,
  IndianRupee,
  MessageCircle,
  PackageCheck,
  Printer,
  QrCode,
  ReceiptText,
  Settings2,
  Table2,
  UserPlus,
  UserRound,
  Users,
  Utensils,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { WhatsAppShareModal } from "@/components/WhatsAppShareModal";
import { QuickActionButton } from "@/components/owner/quick-action";
import { CompactOrderAccordion } from "@/components/orders/CompactOrderAccordion";
import { OrderClassificationBar } from "@/components/orders/order-classification-bar";
import { Button } from "@/components/ui/button";
import { usePersistedOrderFilter } from "@/hooks/use-persisted-order-filter";
import { useWhatsAppShare } from "@/hooks/useWhatsAppShare";
import { useAppStore } from "@/lib/app-store";
import { actualOrderTime, readableOrderId, readableTableOrderId, relativeOrderTime } from "@/lib/order-display";
import { isLiveTerminalStatus, mergeLiveOperationalOrders, type LiveOperationalOrder } from "@/lib/live-operational-orders";
import { applyRealtimePatch } from "@/lib/realtime-patch";
import { buildOrderClassificationOptions, buildOrderOperationOptions, filterOrdersByClassification, filterOrdersByOperation, orderClassificationIds, orderOperationIds, sortOrdersByOperationalPriority, type OrderClassificationId, type OrderOperationId } from "@/lib/order-classification";
import type { DemoOrder, MenuItem, OfflineQueueItem, OrderLine, PosTable, PrinterSettings, StaffMember, TableOrder } from "@/lib/types";
import type { OrderBadgeTone } from "@/components/orders/OrderAccordion.types";
import { cn, formatCurrency } from "@/lib/utils";

const dashboardPrefsKey = "sarva-owner-dashboard-prefs:v2";
const widgetIds = ["live", "kitchen", "alerts", "sales", "trend", "type", "top", "actions", "system", "staff"] as const;
type WidgetId = (typeof widgetIds)[number];

type CanonicalOrder = {
  id: string;
  orderNumber?: string | number;
  displayOrderNumber?: string | number;
  invoiceNumber?: string;
  billNumber?: string;
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  lines: Array<{ menuItemId: string; name: string; price: number; quantity: number; notes?: string }>;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: DemoOrder["status"];
  paymentStatus?: string;
  channel: DemoOrder["channel"];
  fulfillmentType?: DemoOrder["fulfillmentType"];
  orderType?: DemoOrder["fulfillmentType"];
  tableNumber?: string;
  waiterName?: string;
  createdAt: string;
  deliveryOtp?: string;
  kitchenOrderId?: string;
};

type OperationalStreamPayload = {
  orders?: DemoOrder[];
  kitchen?: TableOrder[];
  ordersUpsert?: DemoOrder[];
  kitchenUpsert?: TableOrder[];
  orderIdsRemoved?: string[];
  kitchenIdsRemoved?: string[];
};

type AnalyticsSnapshot = {
  orderCount: number;
  revenue: number;
  customerCount: number;
  loyaltyCount: number;
  menuCount: number;
  staffCount: number;
  kitchenCount: number;
};

const widgetLabels: Record<WidgetId, string> = {
  live: "Live orders",
  kitchen: "Kitchen queue",
  alerts: "Alerts",
  sales: "Sales today",
  trend: "Order trend",
  type: "Orders by type",
  top: "Top selling items",
  actions: "Quick actions",
  system: "System status",
  staff: "Staff activity",
};

export default function OwnerDashboardPage() {
  const authUser = useAppStore((state) => state.authUser);
  const restaurants = useAppStore((state) => state.restaurants);
  const ownerBusinessProfile = useAppStore((state) => state.ownerBusinessProfile);
  const printerSettings = useAppStore((state) => state.printerSettings);
  const [canonicalOrders, setCanonicalOrders] = useState<DemoOrder[]>([]);
  const [canonicalCustomerCount, setCanonicalCustomerCount] = useState(0);
  const [canonicalMenuItems, setCanonicalMenuItems] = useState<MenuItem[]>([]);
  const [canonicalStaffMembers, setCanonicalStaffMembers] = useState<StaffMember[]>([]);
  const [canonicalTables, setCanonicalTables] = useState<PosTable[]>([]);
  const [canonicalKitchenOrders, setCanonicalKitchenOrders] = useState<TableOrder[]>([]);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<WidgetId>>(new Set());
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>([...widgetIds]);
  const [prefsReady, setPrefsReady] = useState(false);
  const [updatedSeconds, setUpdatedSeconds] = useState(0);
  const liveOrdersPatchedRef = useRef(false);
  const liveKitchenPatchedRef = useRef(false);
  const whatsappShare = useWhatsAppShare();

  const metrics = useMemo(
    () => buildDashboardMetrics({
      orders: canonicalOrders,
      tableOrders: canonicalKitchenOrders,
      menuItems: canonicalMenuItems,
      customerCount: canonicalCustomerCount,
      analytics: analyticsSnapshot,
      staffMembers: canonicalStaffMembers,
      posTables: canonicalTables,
      offlineQueue: [],
      printerSettings: { ...printerSettings, connectionStatus: "browser-preview" },
    }),
    [analyticsSnapshot, canonicalCustomerCount, canonicalKitchenOrders, canonicalMenuItems, canonicalOrders, canonicalStaffMembers, canonicalTables, printerSettings],
  );
  const currentRestaurant = restaurants.find((restaurant) => restaurant.slug === authUser.restaurantSlug || restaurant.id === authUser.restaurantSlug);
  const ownerName = displayOwnerGreetingName(ownerBusinessProfile?.ownerName, ownerBusinessProfile?.hotelName, currentRestaurant?.displayName || currentRestaurant?.name, authUser.name);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(dashboardPrefsKey) ?? "{}") as { hidden?: WidgetId[]; order?: WidgetId[] };
        setHiddenWidgets(new Set((stored.hidden ?? []).filter((item): item is WidgetId => widgetIds.includes(item as WidgetId))));
        const validOrder = (stored.order ?? []).filter((item): item is WidgetId => widgetIds.includes(item as WidgetId));
        setWidgetOrder(validOrder.length ? [...validOrder, ...widgetIds.filter((item) => !validOrder.includes(item))] : [...widgetIds]);
      } catch {
        setHiddenWidgets(new Set());
        setWidgetOrder([...widgetIds]);
      } finally {
        setPrefsReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    window.localStorage.setItem(dashboardPrefsKey, JSON.stringify({ hidden: Array.from(hiddenWidgets), order: widgetOrder }));
  }, [hiddenWidgets, prefsReady, widgetOrder]);

  useEffect(() => {
    const interval = window.setInterval(() => setUpdatedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/owner/analytics", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: Partial<AnalyticsSnapshot> & { orders?: CanonicalOrder[]; customerCount?: number; menu?: MenuItem[]; staff?: StaffMember[]; tables?: PosTable[]; kitchen?: TableOrder[] } }) => {
        if (!active) return;
        const data = payload.data;
        if (!liveOrdersPatchedRef.current) setCanonicalOrders((payload.data?.orders ?? []).map(canonicalToDemoOrder));
        setCanonicalCustomerCount(Number(payload.data?.customerCount ?? 0));
        setCanonicalMenuItems(payload.data?.menu ?? []);
        setCanonicalStaffMembers(payload.data?.staff ?? []);
        setCanonicalTables(payload.data?.tables ?? []);
        if (!liveKitchenPatchedRef.current) setCanonicalKitchenOrders(payload.data?.kitchen ?? []);
        setAnalyticsSnapshot({
          orderCount: Number(data?.orderCount ?? data?.orders?.length ?? 0),
          revenue: Number(data?.revenue ?? 0),
          customerCount: Number(data?.customerCount ?? 0),
          loyaltyCount: Number(data?.loyaltyCount ?? 0),
          menuCount: Number(data?.menuCount ?? data?.menu?.length ?? 0),
          staffCount: Number(data?.staffCount ?? data?.staff?.length ?? 0),
          kitchenCount: Number(data?.kitchenCount ?? data?.kitchen?.length ?? 0),
        });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const events = new EventSource("/api/owner/pos/stream");
    events.addEventListener("state", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as OperationalStreamPayload;
        if (payload.orders || payload.ordersUpsert?.length || payload.orderIdsRemoved?.length) {
          liveOrdersPatchedRef.current = true;
          setCanonicalOrders((current) => applyRealtimePatch(current, payload.orders, payload.ordersUpsert, payload.orderIdsRemoved));
        }
        if (payload.kitchen || payload.kitchenUpsert?.length || payload.kitchenIdsRemoved?.length) {
          liveKitchenPatchedRef.current = true;
          setCanonicalKitchenOrders((current) => applyRealtimePatch(current, payload.kitchen, payload.kitchenUpsert, payload.kitchenIdsRemoved));
        }
      } catch {
        // Keep the last valid owner dashboard snapshot.
      }
    });
    return () => events.close();
  }, []);

  function toggleWidget(id: WidgetId) {
    setHiddenWidgets((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function moveWidget(id: WidgetId, direction: -1 | 1) {
    setWidgetOrder((current) => {
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case "live":
        return <LiveOrdersPanel orders={metrics.liveRows} />;
      case "kitchen":
        return <KitchenPanel metrics={metrics} />;
      case "alerts":
        return <AlertsPanel alerts={metrics.alerts} />;
      case "sales":
        return <SalesTodayPanel metrics={metrics} />;
      case "trend":
        return <OrderTrendPanel metrics={metrics} />;
      case "type":
        return <OrderTypePanel metrics={metrics} />;
      case "top":
        return <TopItemsPanel items={metrics.topItems} onShareItem={(item) => void whatsappShare.openShare({ item, restaurant: restaurants.find((restaurant) => restaurant.slug === item.restaurantSlug) })} />;
      case "actions":
        return <QuickActionsPanel />;
      case "system":
        return <SystemPanel metrics={metrics} />;
      case "staff":
        return <StaffPanel metrics={metrics} />;
      default:
        return null;
    }
  };

  const visibleWidgets = widgetOrder.filter((item) => !hiddenWidgets.has(item));
  const liveWidgets = visibleWidgets.filter((item) => ["live", "kitchen", "alerts"].includes(item));
  const analyticsWidgets = visibleWidgets.filter((item) => ["sales", "trend", "type", "top"].includes(item));
  const bottomWidgets = visibleWidgets.filter((item) => ["actions", "system", "staff"].includes(item));

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Good morning, {ownerName}! 👋</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              Restaurant operational
            </span>
            <span className="text-slate-300">•</span>
            <span>{updatedSeconds < 2 ? "Updated just now" : `Updated ${updatedSeconds} sec ago`}</span>
            <span className="text-slate-300">•</span>
            <button type="button" className="font-black text-orange-600" onClick={() => window.dispatchEvent(new CustomEvent("sarva-open-sync-center"))}>
              Sync {metrics.sync.failed ? `${metrics.sync.failed} failed` : "healthy"}
            </button>
          </p>
        </div>
        <div className="relative">
          <Button variant="outline" className="w-full justify-center lg:w-auto" onClick={() => setPrefsOpen((value) => !value)} title="Hide, show, or reorder dashboard widgets">
            <Settings2 className="size-4" />
            Customize
          </Button>
          {prefsOpen ? (
            <CustomizePanel
              hiddenWidgets={hiddenWidgets}
              widgetOrder={widgetOrder}
              onToggle={toggleWidget}
              onMove={moveWidget}
              onClose={() => setPrefsOpen(false)}
            />
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <KpiCard title="Revenue" value={metrics.revenueToday} format={formatCurrency} delta={metrics.revenueDelta} icon={IndianRupee} tone="green" spark={metrics.revenueSpark} tooltip="Repository revenue for this restaurant." />
        <KpiCard title="Orders" value={metrics.activeOrdersCount} delta={`${metrics.ordersToday} total`} icon={ReceiptText} tone="orange" spark={metrics.orderSpark} tooltip="Canonical order count from analytics." />
        <KpiCard title="Kitchen Operations" value={metrics.kitchen.total} delta={`${metrics.kitchen.delayed} delayed`} icon={ChefHat} tone={metrics.kitchen.delayed ? "red" : "blue"} spark={metrics.kitchen.spark} tooltip="Orders waiting in the kitchen workflow." />
        <KpiCard title="QR Sessions" value={metrics.qr.active} delta={`${metrics.qr.billRequests} bills · ${metrics.qr.serviceRequests} requests`} icon={QrCode} tone={metrics.qr.billRequests ? "orange" : "blue"} spark={metrics.qr.spark} tooltip="Live table QR sessions, bill requests, and waiter requests." />
        <KpiCard title="Staff" value={metrics.staff.total} delta={`${metrics.staff.waitersActive} waiters`} icon={Users} tone="green" spark={metrics.staff.spark} tooltip="Repository staff count for this restaurant." />
        <KpiCard title="Menu" value={metrics.menuCount} delta={`${metrics.loyaltyCount} loyalty`} icon={Utensils} tone="purple" spark={metrics.avgSpark} tooltip="Repository menu count." />
        <KpiCard title="Customers" value={metrics.newCustomers} delta={`${metrics.loyaltyCount} loyalty`} icon={UserRound} tone="amber" spark={metrics.customerSpark} tooltip="Customer and loyalty records available to this restaurant." />
      </section>

      {liveWidgets.length ? (
        <section className="grid gap-4 xl:grid-cols-3">
          {liveWidgets.map((id) => (
            <AnimatedWidget key={id}>{renderWidget(id)}</AnimatedWidget>
          ))}
        </section>
      ) : null}

      {analyticsWidgets.length ? (
        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {analyticsWidgets.map((id) => (
            <AnimatedWidget key={id}>{renderWidget(id)}</AnimatedWidget>
          ))}
        </section>
      ) : null}

      {bottomWidgets.length ? (
        <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
          {bottomWidgets.map((id) => (
            <AnimatedWidget key={id}>{renderWidget(id)}</AnimatedWidget>
          ))}
        </section>
      ) : null}

      <WhatsAppShareModal
        preview={whatsappShare.preview}
        open={Boolean(whatsappShare.preview) || whatsappShare.isPreparing}
        preparing={whatsappShare.isPreparing}
        onOpenChange={(open) => {
          if (!open) whatsappShare.closeShare();
        }}
        onCopy={() => void whatsappShare.copyMessage()}
        onWhatsApp={whatsappShare.openWhatsApp}
        onChannel={whatsappShare.openChannel}
      />
    </div>
  );
}

function displayOwnerGreetingName(ownerName?: string, hotelName?: string, restaurantName?: string, authName?: string) {
  return [ownerName, hotelName, restaurantName, authName]
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value && value !== "Anonymous" && !isMachineDisplayName(value))) || "Owner";
}

function canonicalToDemoOrder(order: CanonicalOrder): DemoOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    displayOrderNumber: order.displayOrderNumber,
    invoiceNumber: order.invoiceNumber,
    billNumber: order.billNumber,
    restaurantSlug: order.restaurantId,
    customer: { name: order.customerName, phone: order.customerPhone, address: order.deliveryAddress ?? "" },
    lines: order.lines.map((line) => ({ itemId: line.menuItemId, name: line.name, price: line.price, quantity: line.quantity, notes: line.notes })),
    totals: { subtotal: order.subtotal, discount: order.discount, deliveryFee: order.deliveryFee, tax: order.tax, total: order.total },
    payment: order.paymentStatus === "paid" ? "upi" : "cod",
    channel: order.channel,
    status: order.status,
    createdAt: order.createdAt,
    deliveryOtp: order.deliveryOtp ?? "",
    fulfillmentType: order.fulfillmentType,
    kitchenOrderId: order.kitchenOrderId,
  };
}

function isMachineDisplayName(value?: string) {
  const text = value?.trim() ?? "";
  return Boolean(text && !text.includes("@") && !text.includes(" ") && /^[A-Za-z0-9_-]{20,}$/.test(text));
}

function AnimatedWidget({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {children}
    </motion.div>
  );
}

function KpiCard({
  title,
  value,
  format = (input: number) => String(Math.round(input)),
  delta,
  icon: Icon,
  tone,
  spark,
  tooltip,
}: {
  title: string;
  value: number;
  format?: (input: number) => string;
  delta: string;
  icon: LucideIcon;
  tone: "green" | "orange" | "blue" | "purple" | "red" | "amber";
  spark: number[];
  tooltip: string;
}) {
  const positive = !delta.trim().startsWith("-");
  return (
    <motion.article
      layout
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      title={tooltip}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-500">{title}</p>
          <AnimatedNumber value={value} format={format} className="mt-2 block text-2xl font-black text-slate-950" />
        </div>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", toneClass[tone].bg, toneClass[tone].text)}>
          <Icon className="size-5" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className={cn("text-xs font-black", positive ? "text-emerald-600" : "text-red-600")}>
          {positive ? "↑" : "↓"} {delta.replace(/^[-+]/, "")}
        </span>
        <Sparkline values={spark} color={toneClass[tone].stroke} className="h-8 w-24" />
      </div>
    </motion.article>
  );
}

function AnimatedNumber({ value, format, className }: { value: number; format: (input: number) => string; className?: string }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    let frame = 0;
    const start = displayRef.current;
    const delta = value - start;
    const startedAt = performance.now();
    const duration = 480;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const next = start + delta * easeOutCubic(progress);
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className={className}>{format(display)}</span>;
}

function LiveOrdersPanel({ orders }: { orders: DashboardOrder[] }) {
  const [classification, setClassification] = usePersistedOrderFilter<OrderClassificationId>("sarva.orderFilters.dashboard.live.primary", "all", orderClassificationIds);
  const [operation, setOperation] = usePersistedOrderFilter<OrderOperationId>("sarva.orderFilters.dashboard.live.operation", "all", orderOperationIds);
  const [now] = useState(() => Date.now());
  const classificationOptions = useMemo(() => buildOrderClassificationOptions(orders, { includeZero: true, now }), [now, orders]);
  const primaryOrders = useMemo(() => filterOrdersByClassification(orders, classification, now), [classification, now, orders]);
  const operationOptions = useMemo(() => buildOrderOperationOptions(primaryOrders, { includeZero: true, now }), [now, primaryOrders]);
  const visibleOrders = useMemo(() => sortOrdersByOperationalPriority(filterOrdersByOperation(primaryOrders, operation, now), now), [now, operation, primaryOrders]);
  return (
    <DashboardCard
      title="Live Orders"
      action={<Link href="/owner/orders" className="text-xs font-black text-orange-600">View all</Link>}
      className="h-full"
    >
      <div className="space-y-2" title="Orders currently being processed.">
        <OrderClassificationBar value={classification} options={classificationOptions} onChange={setClassification} />
        <OrderClassificationBar value={operation} options={operationOptions} onChange={setOperation} label="Operational state" />
        <AnimatePresence initial={false}>
          {visibleOrders.length ? visibleOrders.map((order) => (
            <motion.div key={order.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              <LiveOrderRow order={order} />
            </motion.div>
          )) : <EmptyState title="No active orders" text="The current operations queue is clear." />}
        </AnimatePresence>
      </div>
    </DashboardCard>
  );
}

function KitchenPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <DashboardCard title="Kitchen Operations Center" className="h-full">
      <div className="grid grid-cols-2 gap-3" title="Orders waiting in kitchen workflow.">
        <MiniMetric label="Pending KOT" value={metrics.kitchen.pending} tone="orange" />
        <MiniMetric label="Preparing" value={metrics.kitchen.preparing} tone="blue" />
        <MiniMetric label="Ready" value={metrics.kitchen.ready} tone="green" />
        <MiniMetric label="Delayed" value={metrics.kitchen.delayed} tone="red" pulse={metrics.kitchen.delayed > 0} />
      </div>
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href="/owner/kitchen">
          Open Kitchen Operations
          <ArrowUpRight className="size-4" />
        </Link>
      </Button>
    </DashboardCard>
  );
}

function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <DashboardCard
      title="Alerts & Notifications"
      action={<button type="button" className="text-xs font-black text-orange-600" onClick={() => window.dispatchEvent(new CustomEvent("sarva-open-sync-center"))}>Sync</button>}
      className="h-full"
    >
      <div className="space-y-2" title="Critical operational alerts stay visible here.">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>
    </DashboardCard>
  );
}

function AlertRow({ alert }: { alert: DashboardAlert }) {
  const className = cn(
    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:bg-slate-50",
    alert.priority === "critical" ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white",
    alert.priority === "critical" && "animate-pulse",
  );
  const body = (
    <>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", priorityTone[alert.priority].bg, priorityTone[alert.priority].text)}>
        <alert.icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-black text-slate-950">{alert.title}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-600">{alert.description}</span>
      </span>
    </>
  );
  if (alert.href === "#sync") {
    return (
      <button type="button" className={className} onClick={() => window.dispatchEvent(new CustomEvent("sarva-open-sync-center"))}>
        {body}
      </button>
    );
  }
  return (
    <Link href={alert.href} className={className}>
      {body}
    </Link>
  );
}

function SalesTodayPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <DashboardCard title="Sales Today" className="h-full">
      <div title="Revenue trend for the last seven days, with today's value emphasized.">
        <div className="flex items-start justify-between">
          <div>
            <AnimatedNumber value={metrics.revenueToday} format={formatCurrency} className="text-2xl font-black text-slate-950" />
            <p className="mt-1 text-xs font-semibold text-slate-500">vs yesterday {metrics.revenueDelta}</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{metrics.revenueDelta}</span>
        </div>
        <Sparkline values={metrics.revenueSpark} color="#ff6b2c" className="mt-5 h-24 w-full" filled />
      </div>
    </DashboardCard>
  );
}

function OrderTrendPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <DashboardCard title="Order Trend" className="h-full">
      <MiniBarChart values={metrics.orderSpark} labels={metrics.weekLabels} />
    </DashboardCard>
  );
}

function OrderTypePanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <DashboardCard title="Orders by Type" className="h-full">
      <div className="grid gap-4 sm:grid-cols-[130px_1fr] sm:items-center">
        <DonutChart total={metrics.typeTotal} values={metrics.typeCounts} />
        <div className="space-y-3">
          {metrics.typeCounts.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-bold text-slate-700">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="font-black text-slate-950">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

function TopItemsPanel({ items, onShareItem }: { items: TopDashboardItem[]; onShareItem: (item: MenuItem) => void }) {
  return (
    <DashboardCard
      title="Top Selling Items"
      action={<Link href="/owner/reports" className="text-xs font-black text-orange-600">View report</Link>}
      className="h-full"
    >
      {items.length ? (
        <div className="space-y-3" title="Best-selling items from current order data.">
          {items.map((item, index) => (
            <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-orange-50 text-xs font-black text-orange-600">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">{item.name}</p>
                <p className="text-xs font-semibold text-slate-500">{item.quantity} orders</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-black text-slate-950">{formatCurrency(item.revenue)}</p>
                {item.item ? (
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => item.item && onShareItem(item.item)} aria-label={`Share ${item.name} on WhatsApp`}>
                    <MessageCircle className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No top sellers yet" text="Menu and POS sales will populate this list automatically." />
      )}
    </DashboardCard>
  );
}

function QuickActionsPanel() {
  return (
    <DashboardCard title="Quick Actions" className="h-full">
      <div className="customer-scroll grid grid-flow-col auto-cols-[104px] gap-3 overflow-x-auto pb-1 sm:grid-flow-row sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8">
        <QuickActionButton href="/owner/pos" icon={ReceiptText} label="Open POS" tone="green" />
        <QuickActionButton href="/owner/orders?new=1" icon={CalendarPlus} label="New Order" tone="orange" />
        <QuickActionButton href="/owner/tables?tab=reservations" icon={CalendarPlus} label="Reservation" tone="blue" />
        <QuickActionButton href="/owner/customers" icon={UserPlus} label="Customer" tone="orange" />
        <QuickActionButton href="/owner/kitchen" icon={ChefHat} label="Kitchen" tone="green" />
        <QuickActionButton href="/owner/tables" icon={Table2} label="Tables" tone="blue" />
        <QuickActionButton href="/owner/menu" icon={Utensils} label="Menu" tone="orange" />
        <QuickActionButton href="/owner/reports" icon={BarChart3} label="Reports" tone="cyan" />
        <QuickActionButton href="/owner/inventory" icon={PackageCheck} label="Inventory" tone="purple" />
        <QuickActionButton href="/owner/accounting" icon={CreditCard} label="Accounting" tone="red" />
      </div>
    </DashboardCard>
  );
}

function SystemPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <DashboardCard title="System Status" className="h-full">
      <div className="space-y-3">
        <HealthRow icon={Wifi} label="Internet" value="Connected" tone="green" />
        <HealthRow icon={AlertTriangle} label="Sync Status" value={metrics.sync.failed ? `${metrics.sync.failed} failed` : metrics.sync.pending ? `${metrics.sync.pending} pending` : "All good"} tone={metrics.sync.failed ? "red" : metrics.sync.pending ? "orange" : "green"} />
        <HealthRow icon={Printer} label="Printer" value={metrics.printerLabel} tone={metrics.printerTone} />
      </div>
    </DashboardCard>
  );
}

function StaffPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <DashboardCard title="Staff Activity" className="h-full">
      <div className="space-y-3">
        <StaffRow label="Waiters active" value={metrics.staff.waitersActive} detail={`${metrics.staff.serving} serving`} />
        <StaffRow label="Cashiers online" value={metrics.staff.cashiersActive} detail="Billing ready" />
        <StaffRow label="Kitchen staff online" value={metrics.staff.kitchenActive} detail={metrics.kitchen.delayed ? `${metrics.kitchen.delayed} delayed` : "Queue healthy"} />
      </div>
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href="/owner/employees">View All Staff</Link>
      </Button>
    </DashboardCard>
  );
}

function CustomizePanel({
  hiddenWidgets,
  widgetOrder,
  onToggle,
  onMove,
  onClose,
}: {
  hiddenWidgets: Set<WidgetId>;
  widgetOrder: WidgetId[];
  onToggle: (id: WidgetId) => void;
  onMove: (id: WidgetId, direction: -1 | 1) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-12 z-30 w-[min(92vw,380px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-black text-slate-950">Customize dashboard</p>
          <p className="text-xs font-semibold text-slate-500">Saved locally on this device.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close customize panel">
          <X className="size-4" />
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {widgetOrder.map((id, index) => (
          <div key={id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
            <GripVertical className="size-4 text-slate-400" />
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-black text-slate-800">
              <input type="checkbox" checked={!hiddenWidgets.has(id)} onChange={() => onToggle(id)} className="size-4 accent-orange-600" />
              <span className="truncate">{widgetLabels[id]}</span>
            </label>
            <button type="button" className="rounded-lg border p-1 disabled:opacity-30" onClick={() => onMove(id, -1)} disabled={index === 0} aria-label={`Move ${widgetLabels[id]} up`}>
              <ArrowUp className="size-3.5" />
            </button>
            <button type="button" className="rounded-lg border p-1 disabled:opacity-30" onClick={() => onMove(id, 1)} disabled={index === widgetOrder.length - 1} aria-label={`Move ${widgetLabels[id]} down`}>
              <ArrowDown className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

type StatusValue = { label: string; value: number; color: string };
type DashboardAlert = {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "medium" | "normal" | "success";
  icon: LucideIcon;
  href: string;
};
type DashboardOrder = {
  id: string;
  createdAt: string;
  status: string;
  amount: number;
  customer: string;
  source: string;
  paymentStatus?: string;
  table?: string;
  lines: OrderLine[];
  type: string;
};
type TopDashboardItem = {
  name: string;
  quantity: number;
  revenue: number;
  item?: MenuItem;
};
type DashboardMetrics = ReturnType<typeof buildDashboardMetrics>;

function LiveOrderRow({ order }: { order: DashboardOrder }) {
  const [open, setOpen] = useState(false);
  const elapsed = elapsedMinutes(order.createdAt);
  const delayed = elapsedMinutes(order.createdAt) >= 15 && !isTerminal(order.status);
  return (
    <CompactOrderAccordion
      id={`dashboard-order-${order.id}`}
      orderNumber={order.id}
      etaLabel={delayed ? `${elapsed}m waiting` : relativeOrderTime(order.createdAt)}
      orderTypeLabel={order.type}
      tableLabel={order.table ?? order.source}
      itemCountLabel={`${order.lines.reduce((sum, line) => sum + line.quantity, 0)} items`}
      status={{ label: order.status, tone: dashboardStatusTone(order.status) }}
      priority={{ label: delayed ? "Delayed" : "Normal", tone: delayed ? "warning" : "muted", icon: delayed ? <AlertTriangle className="size-3.5" /> : <ReceiptText className="size-3.5" /> }}
      badges={[{ label: order.source, tone: "muted" }]}
      delay={{ delayed, level: delayed ? "orange" : "none", label: "Delayed", lateMinutes: Math.max(0, elapsed - 15), waitingLabel: `${elapsed} min` }}
      items={order.lines.map((line, index) => ({
        id: `${order.id}-${line.itemId}-${index}`,
        name: line.name,
        quantity: line.quantity,
        note: line.notes,
        meta: formatCurrency(line.price * line.quantity),
      }))}
      facts={[
        { label: "Customer", value: order.customer },
        { label: "Source", value: order.source },
        { label: "Created", value: actualOrderTime(order.createdAt) },
        { label: "Total", value: formatCurrency(order.amount) },
      ]}
      secondaryActions={[{ id: "open", label: "Open", icon: <ArrowUpRight className="size-4" />, onClick: () => { window.location.href = `/owner/orders?search=${encodeURIComponent(order.id)}`; } }]}
      isOpen={open}
      onOpenChange={setOpen}
    />
  );
}

function dashboardStatusTone(status: string): OrderBadgeTone {
  if (["ready", "picked-up", "served", "delivered", "completed"].includes(status)) return "success";
  if (["new", "occupied"].includes(status)) return "warning";
  if (["cancelled", "rejected"].includes(status)) return "danger";
  return "info";
}

function MiniMetric({ label, value, tone, pulse = false }: { label: string; value: number; tone: "green" | "orange" | "blue" | "red"; pulse?: boolean }) {
  return (
    <motion.div layout className={cn("rounded-2xl p-4", toneClass[tone].soft, pulse && "animate-pulse")} title={label === "Delayed" ? "Orders exceeding configured preparation time." : `${label} kitchen tickets.`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <AnimatedNumber value={value} format={(input) => String(Math.round(input))} className="mt-2 block text-2xl font-black" />
    </motion.div>
  );
}

function StaffRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3" title={`${label}: ${detail}`}>
      <div>
        <p className="font-black text-neutral-950">{label}</p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
      <span className="grid size-10 place-items-center rounded-full bg-emerald-50 font-black text-emerald-700">{value}</span>
    </div>
  );
}

function HealthRow({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: "green" | "orange" | "red" }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (label === "Sync Status") window.dispatchEvent(new CustomEvent("sarva-open-sync-center"));
      }}
      className="flex w-full items-center justify-between rounded-xl border border-neutral-200 p-3 text-left transition hover:bg-slate-50"
      title={label === "Sync Status" ? "Open sync center and retry failed actions." : `${label}: ${value}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", toneClass[tone].bg, toneClass[tone].text)}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-black text-neutral-950">{label}</span>
          <span className="block truncate text-sm text-slate-500">{value}</span>
        </span>
      </span>
      <ArrowUpRight className="size-4 text-slate-400" />
    </button>
  );
}

function DonutChart({ total, values }: { total: number; values: StatusValue[] }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = values.reduce<Array<StatusValue & { length: number; offset: number }>>((items, item) => {
    const previousOffset = items.at(-1) ? items.at(-1)!.offset + items.at(-1)!.length : 0;
    return [...items, { ...item, length: total ? (item.value / total) * circumference : 0, offset: previousOffset }];
  }, []);
  return (
    <div className="relative grid size-32 place-items-center">
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#eef2f7" strokeWidth="14" />
        {segments.map((item) => (
          <motion.circle
            key={item.label}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth="14"
            strokeDasharray={`${item.length} ${circumference - item.length}`}
            strokeDashoffset={-item.offset}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${item.length} ${circumference - item.length}` }}
          />
        ))}
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-neutral-950">{total}</p>
        <p className="text-xs font-semibold text-slate-500">Total</p>
      </div>
    </div>
  );
}

function Sparkline({ values, color, className, filled = false }: { values: number[]; color: string; className?: string; filled?: boolean }) {
  const points = buildPoints(values, 100, 36);
  const area = points ? `M ${points} L 100 36 L 0 36 Z` : "";
  return (
    <svg viewBox="0 0 100 36" className={className} aria-hidden="true">
      {filled && area ? <path d={area} fill={color} opacity="0.12" /> : null}
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.55 }}
      />
    </svg>
  );
}

function MiniBarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-40 items-end gap-2" title="Seven day order volume.">
      {values.map((value, index) => (
        <div key={`${labels[index]}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <motion.div
            className="w-full rounded-t-xl bg-emerald-500/85"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(8, (value / max) * 112)}px` }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
          />
          <span className="text-[11px] font-black text-slate-500">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center">
      <p className="font-black text-neutral-950">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function buildDashboardMetrics({
  orders,
  tableOrders,
  menuItems,
  customerCount,
  analytics,
  staffMembers,
  posTables,
  offlineQueue,
  printerSettings,
}: {
  orders: DemoOrder[];
  tableOrders: TableOrder[];
  menuItems: MenuItem[];
  customerCount: number;
  analytics: AnalyticsSnapshot | null;
  staffMembers: StaffMember[];
  posTables: PosTable[];
  offlineQueue: OfflineQueueItem[];
  printerSettings: PrinterSettings;
}) {
  const liveOperationalOrders = mergeLiveOperationalOrders(orders, tableOrders);
  const liveRows = liveOperationalOrders.filter((order) => !isLiveTerminalStatus(order.status)).map(dashboardRowFromLiveOrder);
  const kitchenOnlyRows = liveOperationalOrders.filter((order) => !order.canonicalOrderId).map(dashboardRowFromLiveOrder);
  const combined: DashboardOrder[] = [
    ...orders.map((order) => ({
      id: readableOrderId(order),
      createdAt: order.createdAt,
      status: order.status,
      amount: order.totals.total,
      customer: order.customer.name,
      source: `${order.fulfillmentType ?? order.channel}`,
      lines: order.lines,
      type: order.fulfillmentType ?? order.channel,
    })),
    ...kitchenOnlyRows,
  ];
  const today = new Date();
  const yesterday = addDays(today, -1);
  const todayOrders = combined.filter((order) => isSameDay(order.createdAt, today));
  const yesterdayOrders = combined.filter((order) => isSameDay(order.createdAt, yesterday));
  const revenueToday = sum(todayOrders.map((order) => order.amount));
  const revenueYesterday = sum(yesterdayOrders.map((order) => order.amount));
  const ordersToday = todayOrders.length;
  const ordersYesterday = yesterdayOrders.length;
  const avgOrderValue = ordersToday ? revenueToday / ordersToday : 0;
  const avgYesterday = ordersYesterday ? revenueYesterday / ordersYesterday : 0;
  const week = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const weekRevenue = week.map((date) => sum(combined.filter((order) => isSameDay(order.createdAt, date)).map((order) => order.amount)));
  const weekOrders = week.map((date) => combined.filter((order) => isSameDay(order.createdAt, date)).length);
  const activeOrders = liveRows.sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
  const kitchenOrders = tableOrders;
  const activeKitchenOrders = kitchenOrders.filter((order) => !isTerminal(order.status));
  const preparing = kitchenOrders.filter((order) => order.status === "preparing" || order.status === "occupied").length;
  const ready = kitchenOrders.filter((order) => order.status === "ready").length;
  const pending = kitchenOrders.filter((order) => order.status === "new").length;
  const delayed = kitchenOrders.filter((order) => elapsedMinutes(order.createdAt) >= 15 && !isTerminal(order.status)).length;
  const waitersActive = staffMembers.filter((member) => member.role === "waiter" && member.status === "active").length;
  const serving = new Set(tableOrders.filter((order) => !isTerminal(order.status) && order.waiterId).map((order) => order.waiterId)).size;
  const syncFailed = offlineQueue.filter((item) => item.status === "failed" || item.status === "conflict").length;
  const syncPending = offlineQueue.filter((item) => item.status === "queued" || item.status === "retrying").length;
  const activeQrTables = posTables.filter((table) => table.currentSessionId && table.sessionStatus === "active");
  const billRequests = activeQrTables.filter((table) => table.billRequestedAt).length;
  const serviceRequests = activeQrTables.reduce((count, table) => count + (table.serviceRequests ?? []).filter((request) => request.status === "open").length, 0);
  const printerLabel = printerSettings.connectionStatus === "connected" ? "Connected" : printerSettings.connectionStatus === "browser-preview" ? "Browser preview" : "Offline";
  const printerTone = printerSettings.connectionStatus === "offline" ? "red" : "green";
  const typeCounts = buildTypeCounts(combined);
  const alerts = buildAlerts({ activeOrders, delayed, syncFailed, syncPending, printerOffline: printerTone === "red" });

  return {
    revenueToday,
    revenueDelta: percentDelta(revenueToday, revenueYesterday),
    ordersToday,
    ordersDelta: percentDelta(ordersToday, ordersYesterday),
    activeOrdersCount: activeOrders.length,
    avgOrderValue,
    avgDelta: percentDelta(avgOrderValue, avgYesterday),
    newCustomers: analytics?.customerCount ?? customerCount,
    customerDelta: "+0%",
    revenueSpark: weekRevenue,
    orderSpark: weekOrders,
    avgSpark: week.map((date) => {
      const dayOrders = combined.filter((order) => isSameDay(order.createdAt, date));
      return dayOrders.length ? sum(dayOrders.map((order) => order.amount)) / dayOrders.length : 0;
    }),
    customerSpark: week.map(() => customerCount),
    weekLabels: week.map((date) => date.toLocaleDateString("en-IN", { weekday: "short" })),
    topItems: buildTopItems(combined.flatMap((order) => order.lines), menuItems),
    liveRows: activeOrders.slice(0, 5),
    typeCounts,
    typeTotal: sum(typeCounts.map((item) => item.value)),
    kitchen: {
      total: activeKitchenOrders.length,
      pending,
      preparing,
      ready,
      delayed,
      spark: week.map((date) => tableOrders.filter((order) => isSameDay(order.createdAt, date) && !isTerminal(order.status)).length),
    },
    staff: {
      total: analytics?.staffCount ?? staffMembers.length,
      waitersActive,
      serving,
      idleWaiters: Math.max(0, waitersActive - serving),
      cashiersActive: staffMembers.filter((member) => member.role === "cashier" && member.status === "active").length,
      kitchenActive: staffMembers.filter((member) => ["chef", "kitchen-manager"].includes(member.role) && member.status === "active").length,
      spark: week.map(() => waitersActive),
    },
    qr: {
      active: activeQrTables.length,
      billRequests,
      serviceRequests,
      scans: posTables.reduce((count, table) => count + Number(table.qrUsageCount ?? 0), 0),
      spark: week.map(() => activeQrTables.length),
    },
    sync: { failed: syncFailed, pending: syncPending },
    printerLabel,
    printerTone: printerTone as "green" | "red",
    activeTables: posTables.filter((table) => table.status === "Dining" || table.status === "Bill requested").length,
    menuCount: analytics?.menuCount ?? menuItems.length,
    loyaltyCount: analytics?.loyaltyCount ?? 0,
    alerts,
  };
}

function dashboardRowFromLiveOrder(order: LiveOperationalOrder, index: number): DashboardOrder {
  return {
    id: readableTableOrderId(order, index + 1),
    createdAt: order.createdAt,
    status: order.status,
    amount: order.total ?? orderTotal(order),
    customer: order.customerName ?? order.guestName ?? order.customerPhone ?? "Guest",
    source: order.source,
    paymentStatus: order.paymentStatus,
    table: order.tableNumber,
    lines: order.lines,
    type: order.orderType ?? order.source,
  };
}

function buildAlerts({ activeOrders, delayed, syncFailed, syncPending, printerOffline }: { activeOrders: DashboardOrder[]; delayed: number; syncFailed: number; syncPending: number; printerOffline: boolean }) {
  const alerts: DashboardAlert[] = [];
  if (delayed) {
    alerts.push({
      id: "delayed",
      title: `${delayed} delayed kitchen order${delayed === 1 ? "" : "s"}`,
      description: "Review tickets exceeding configured preparation time.",
      priority: "critical",
      icon: AlertTriangle,
      href: "/owner/kitchen",
    });
  }
  const online = activeOrders.find((order) => ["delivery", "web", "online", "swiggy", "zomato"].includes(order.type.toLowerCase()));
  if (online) {
    alerts.push({
      id: `online-${online.id}`,
      title: "New online order",
      description: `${online.id} · ${online.customer} · ${formatCurrency(online.amount)}`,
      priority: "medium",
      icon: ReceiptText,
      href: `/owner/orders?search=${encodeURIComponent(online.id)}`,
    });
  }
  if (syncFailed) {
    alerts.push({
      id: "sync-failed",
      title: "Sync needs attention",
      description: `${syncFailed} failed offline action${syncFailed === 1 ? "" : "s"}. Retry from sync center.`,
      priority: "critical",
      icon: AlertTriangle,
      href: "#sync",
    });
  } else if (syncPending) {
    alerts.push({
      id: "sync-pending",
      title: "Sync in progress",
      description: `${syncPending} action${syncPending === 1 ? "" : "s"} waiting for backend confirmation.`,
      priority: "normal",
      icon: Wifi,
      href: "#sync",
    });
  }
  if (printerOffline) {
    alerts.push({
      id: "printer-offline",
      title: "Printer offline",
      description: "Kitchen or billing printer is not connected.",
      priority: "medium",
      icon: Printer,
      href: "/owner/settings?tab=printer",
    });
  }
  if (!alerts.length) {
    alerts.push({
      id: "all-good",
      title: "Operations normal",
      description: "No critical kitchen, order, or sync alerts right now.",
      priority: "success",
      icon: Wifi,
      href: "/owner/orders",
    });
  }
  return alerts;
}

function buildTypeCounts(orders: DashboardOrder[]) {
  const entries = [
    { label: "Dine-in", match: ["dine-in", "waiter"], color: "#3b82f6" },
    { label: "Online", match: ["delivery", "web", "online", "swiggy", "zomato"], color: "#10b981" },
    { label: "Parcel", match: ["parcel", "takeaway"], color: "#f97316" },
    { label: "Others", match: [], color: "#8b5cf6" },
  ];
  const lowerTypes = orders.map((order) => order.type.toLowerCase());
  const used = new Set<number>();
  const counts = entries.slice(0, 3).map((entry) => {
    const value = lowerTypes.filter((type, index) => {
      const matched = entry.match.some((item) => type.includes(item));
      if (matched) used.add(index);
      return matched;
    }).length;
    return { label: entry.label, value, color: entry.color };
  });
  counts.push({ label: "Others", value: Math.max(0, orders.length - used.size), color: "#8b5cf6" });
  return counts;
}

function buildTopItems(lines: OrderLine[], menuItems: MenuItem[]): TopDashboardItem[] {
  const byId = new Map(menuItems.map((item) => [item.id, item]));
  const byName = new Map(menuItems.map((item) => [item.name.trim().toLowerCase(), item]));
  const items = new Map<string, TopDashboardItem>();
  lines.forEach((line) => {
    const baseId = line.itemId.split("::")[0];
    const sourceItem = byId.get(baseId) ?? byName.get(line.name.trim().toLowerCase());
    const key = sourceItem?.id ?? line.name;
    const current = items.get(key) ?? { name: sourceItem?.name ?? line.name, quantity: 0, revenue: 0, item: sourceItem };
    current.quantity += line.quantity;
    current.revenue += line.quantity * line.price;
    items.set(key, current);
  });
  return Array.from(items.values()).sort((first, second) => second.quantity - first.quantity).slice(0, 4);
}

function orderTotal(order: TableOrder) {
  return order.total ?? order.lines.reduce((total, line) => total + line.price * line.quantity, 0);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(value: string, date: Date) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toDateString() === date.toDateString();
}

function isTerminal(status: string) {
  return ["delivered", "completed", "cancelled", "rejected", "billed"].includes(status);
}

function elapsedMinutes(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

function percentDelta(current: number, previous: number) {
  if (!previous && current) return "+100%";
  if (!previous) return "+0%";
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function buildPoints(values: number[], width: number, height: number) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

const toneClass = {
  green: { bg: "bg-emerald-50", soft: "bg-emerald-50 text-emerald-700", text: "text-emerald-600", stroke: "#10b981" },
  orange: { bg: "bg-orange-50", soft: "bg-orange-50 text-orange-700", text: "text-orange-600", stroke: "#ff6b2c" },
  blue: { bg: "bg-blue-50", soft: "bg-blue-50 text-blue-700", text: "text-blue-600", stroke: "#3b82f6" },
  purple: { bg: "bg-violet-50", soft: "bg-violet-50 text-violet-700", text: "text-violet-600", stroke: "#8b5cf6" },
  red: { bg: "bg-red-50", soft: "bg-red-50 text-red-700", text: "text-red-600", stroke: "#ef4444" },
  amber: { bg: "bg-amber-50", soft: "bg-amber-50 text-amber-700", text: "text-amber-600", stroke: "#f59e0b" },
};

const priorityTone = {
  critical: { bg: "bg-red-100", text: "text-red-700" },
  medium: { bg: "bg-orange-100", text: "text-orange-700" },
  normal: { bg: "bg-blue-100", text: "text-blue-700" },
  success: { bg: "bg-emerald-100", text: "text-emerald-700" },
};
