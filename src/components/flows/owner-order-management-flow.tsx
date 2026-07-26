"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import * as Popover from "@radix-ui/react-popover";
import { showLazySarvaNotification, toast } from "@/lib/client-toast";
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
  MoreHorizontal,
  PackageCheck,
  Phone,
  ReceiptText,
  QrCode,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Timer,
  Truck,
  Utensils,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { CompactOrderAccordion } from "@/components/orders/CompactOrderAccordion";
import { OperationalOrderStatusBadge } from "@/components/orders/OperationalOrderStatusBadge";
import { OrderFilters } from "@/components/orders/order-filters";
import { OrderMetricCard } from "@/components/orders/metric-card";
import { buildOperationalOrders, type OperationalOrder } from "@/lib/active-orders-model";
import { parseFirestoreDateIso } from "@/lib/firestore-date";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAlert } from "@/hooks/useAlert";
import { actualOrderTime, readableOrderId, readableTableOrderId, relativeOrderTime } from "@/lib/order-display";
import { formatDelayTime, getKitchenDelay, type DelayPriority } from "@/lib/kitchen-delay";
import { serviceStatusForKitchenOrder } from "@/lib/live-operational-orders";
import { defaultOperationalSettings, normalizeOperationalSettings, type OperationalSettings } from "@/lib/order-delay-settings";
import { normalizePhone } from "@/lib/phone";
import { applyRealtimePatch } from "@/lib/realtime-patch";
import type { CateringQuote, DemoOrder, OrderChannel, OrderStatus, TableOrder, TableOrderStatus } from "@/lib/types";

const ActiveOrdersPanel = dynamic(() => import("@/components/flows/active-orders-panel").then((module) => module.ActiveOrdersPanel), {
  ssr: false,
  loading: () => <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">Loading active orders...</div>,
});
import { cn, formatCurrency } from "@/lib/utils";
import type { OrderDoc } from "@/types/firebase";
import type { OrderAccordionDelay, OrderBadgeTone, OrderDelayLevel } from "@/components/orders/OrderAccordion.types";

const IntegrationDialog = dynamic(() => import("@/components/orders/integration-dialog").then((module) => module.IntegrationDialog), { loading: () => null });
const PartnerCard = dynamic(() => import("@/components/orders/partner-card").then((module) => module.PartnerCard), { loading: () => null });

type OrderTab = "all" | "dine-in" | "parcel" | "delivery" | "online" | "qr" | "scheduled" | "catering" | "cancelled";
type SourceFilter = "all" | "website" | "pos" | "zomato" | "swiggy" | "dine-in" | "parcel" | "catering";
type DatePreset = "today" | "yesterday" | "last7" | "week" | "last30" | "month" | "custom";
type DateRange = { preset: DatePreset; from: string; to: string };
type OpsOrder = {
  id: string;
  displayId?: string;
  age: string;
  actualTime?: string;
  source: string;
  customer: string;
  phone: string;
  email?: string;
  address?: string;
  previousOrderCount?: number;
  customerRating?: number;
  type: string;
  tableNumber?: string;
  status: string;
  itemCount: number;
  total: number;
  payment: string;
  instructions?: string;
  scheduledLabel?: string;
  prepSuggestion?: string;
  delay?: { delayed: boolean; lateMinutes: number; priority: DelayPriority; elapsedLabel: string };
};
type ActiveOpsOrder = OpsOrder & {
  canonicalOrderId?: string;
  createdAtMs: number;
  etaLabel: string;
  itemSummary: string;
  lines: Array<{ name: string; quantity: number; modifiers?: string[]; notes?: string; allergyNote?: string }>;
  timeline: Array<{ label: string; at?: string }>;
  kitchenStatus: string;
  paymentStatusLabel: string;
  priorityLabel: string;
  isOnline: boolean;
  kitchenOrder?: TableOrder;
};

type OperationalStreamPayload = {
  orders?: DemoOrder[];
  kitchen?: TableOrder[];
  ordersUpsert?: DemoOrder[];
  kitchenUpsert?: TableOrder[];
  orderIdsRemoved?: string[];
  kitchenIdsRemoved?: string[];
};
type ActiveOrderSummary = {
  withWaiter: number;
  inKitchen: number;
  ready: number;
  served: number;
  pendingBills: number;
  delayed: number;
};

const dateRangeSessionKey = "sarva-owner-orders-date-range:v1";
const operationsPanelStorageKey = "sarva-owner-orders-operations-panel:v1";
const activeOrderHandoffKey = "sarva-pos-active-handoff:v1";

const nextKitchenStatus: Record<TableOrderStatus, TableOrderStatus> = {
  new: "accepted",
  occupied: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "served",
  served: "completed",
  completed: "completed",
  cancelled: "cancelled",
  billed: "completed",
};
const orderTabs: Array<{ key: OrderTab; label: string; icon: LucideIcon }> = [
  { key: "all", label: "All", icon: ClipboardList },
  { key: "dine-in", label: "Dine In", icon: Utensils },
  { key: "parcel", label: "Parcel", icon: PackageCheck },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "online", label: "Online", icon: Globe2 },
  { key: "qr", label: "QR", icon: QrCode },
  { key: "scheduled", label: "Scheduled", icon: CalendarClock },
  { key: "catering", label: "Catering", icon: Users },
  { key: "cancelled", label: "Cancelled", icon: AlertTriangle },
];

export function OwnerOrderManagementFlow() {
  const alert = useAlert();
  const [tab, setTab] = useState<OrderTab>("all");
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(() => readSessionDateRange());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [autoAccept, setAutoAccept] = useState(false);
  const [dialogPartner, setDialogPartner] = useState("");
  const [operationsOpen, setOperationsOpen] = useState(() => readStoredBoolean(operationsPanelStorageKey, false));
  const [highlightedOrderIds, setHighlightedOrderIds] = useState<Set<string>>(() => new Set());
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [operationalSettings, setOperationalSettings] = useState<OperationalSettings>(defaultOperationalSettings);
  const knownNewOrders = useRef<Set<string> | null>(null);
  const tableOrdersRef = useRef<TableOrder[]>([]);
  const liveOrdersPatchedRef = useRef(false);
  const liveKitchenPatchedRef = useRef(false);
  const cateringInquiries = useMemo<CateringQuote[]>(() => [], []);
  const debouncedSearch = useDebouncedValue(search, 120);
  const rangeLabel = useMemo(() => formatRangeLabel(dateRange), [dateRange]);
  const mappedOrders = useMemo(() => buildOpsOrders(orders, tableOrders, now, operationalSettings.orderDelayThresholdMinutes), [now, operationalSettings.orderDelayThresholdMinutes, orders, tableOrders]);
  const tabOrders = useMemo(() => mappedOrders.filter((order) => matchesTab(order, tab)), [mappedOrders, tab]);
  const tabCatering = useMemo(() => cateringInquiries.filter((quote) => matchesCateringTab(quote, tab)), [cateringInquiries, tab]);
  const visibleOrders = useMemo(() => tabOrders.filter((order) => matchesFilter(order, filter) && matchesSearch(order, debouncedSearch)), [debouncedSearch, filter, tabOrders]);
  const visibleCatering = useMemo(() => tabCatering.filter((quote) => (filter === "all" || filter === "catering") && matchesCateringSearch(quote, debouncedSearch)), [debouncedSearch, filter, tabCatering]);
  const activeOrders = useMemo(() => visibleOrders.filter(isActiveOpsOrder).sort(newestFirst), [visibleOrders]);
  const unifiedActiveOrders = useMemo(() => buildOperationalOrders(orders, tableOrders), [orders, tableOrders]);
  const visibleUnifiedActiveOrders = useMemo(() => unifiedActiveOrders.filter((order) => matchesOperationalTab(order, tab)), [tab, unifiedActiveOrders]);
  const metrics = useMemo(() => buildOrderMetrics(mappedOrders, tableOrders, cateringInquiries), [cateringInquiries, mappedOrders, tableOrders]);
  const tabCounts = useMemo(() => buildTabCounts(mappedOrders, cateringInquiries), [cateringInquiries, mappedOrders]);
  const filters = useMemo(() => buildFilters(tabOrders, tabCatering), [tabCatering, tabOrders]);
  const activeSummary = useMemo(() => buildActiveOrderSummary(activeOrders), [activeOrders]);
  const activeView = !["catering", "cancelled"].includes(tab);

  useEffect(() => {
    tableOrdersRef.current = tableOrders;
  }, [tableOrders]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    writeStoredBoolean(operationsPanelStorageKey, operationsOpen);
  }, [operationsOpen]);

  useEffect(() => {
    writeSessionDateRange(dateRange);
    liveOrdersPatchedRef.current = false;
    liveKitchenPatchedRef.current = false;
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
      fetch("/api/owner/operational-settings", { cache: "no-store", signal: controller.signal }).then((response) => readOwnerPayload<{ data?: Partial<OperationalSettings> }>(response, "Order settings could not be loaded.")),
    ])
      .then(([ordersPayload, kitchenPayload, settingsPayload]) => {
        if (controller.signal.aborted) return;
        if (!liveOrdersPatchedRef.current) setOrders((ordersPayload.data ?? []).map(toDemoOrder));
        if (!liveKitchenPatchedRef.current) setTableOrders(kitchenPayload.data ?? []);
        setOperationalSettings(normalizeOperationalSettings(settingsPayload.data));
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const events = new EventSource("/api/owner/pos/stream");
    events.addEventListener("state", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as OperationalStreamPayload;
        const orders = payload.orders?.filter((order) => matchesLiveDateRange(order.createdAt, order.scheduledFor, dateRange));
        const ordersUpsert = payload.ordersUpsert?.filter((order) => matchesLiveDateRange(order.createdAt, order.scheduledFor, dateRange));
        const kitchen = payload.kitchen?.filter((order) => matchesLiveDateRange(order.createdAt, order.scheduledFor, dateRange));
        const kitchenUpsert = payload.kitchenUpsert?.filter((order) => matchesLiveDateRange(order.createdAt, order.scheduledFor, dateRange));
        if (orders || ordersUpsert?.length || payload.orderIdsRemoved?.length) {
          liveOrdersPatchedRef.current = true;
          setOrders((current) => applyRealtimePatch(current, orders, ordersUpsert, payload.orderIdsRemoved));
        }
        if (kitchen || kitchenUpsert?.length || payload.kitchenIdsRemoved?.length) {
          liveKitchenPatchedRef.current = true;
          setTableOrders((current) => applyRealtimePatch(current, kitchen, kitchenUpsert, payload.kitchenIdsRemoved));
        }
      } catch {
        // Keep the last valid owner orders snapshot.
      }
    });
    return () => events.close();
  }, [dateRange]);

  const updateOrder = useCallback(async (orderId: string, status: OrderStatus, note?: string) => {
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, note }),
      });
      await readOwnerPayload(response, "Order status could not be updated.");
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
      toast.success(orderStatusToast(status));
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Order status could not be updated.");
      return false;
    }
  }, []);

  const serveOrder = useCallback((order: ActiveOpsOrder) => {
    if (order.kitchenOrder && !order.canonicalOrderId) {
      toast.error("Open and save this order before updating service status.");
      return;
    }
    void updateOrder(order.canonicalOrderId ?? order.id, "served");
  }, [updateOrder]);

  const focusOrder = useCallback((order: ActiveOpsOrder) => {
    setTab("all");
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
    const firstConfirm = await alert.confirm(`Reject ${order.displayId ?? "this order"}?`, {
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
    const finalConfirm = await alert.confirm(`Reject ${order.displayId ?? "this order"} for: ${note}?`, {
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
    const firstConfirm = await alert.confirm(`Reject ${order.displayId ?? "this order"}?`, {
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
    const finalConfirm = await alert.confirm(`Reject ${order.displayId ?? "this order"} for: ${reason.trim()}?`, {
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
    showLazySarvaNotification({
      id,
      tone: order.delay?.priority === "critical" ? "critical" : "info",
      title: "New Order",
      message: `${order.displayId ?? "Order"} · ${order.itemCount} item${order.itemCount === 1 ? "" : "s"} · ${formatCurrency(order.total)} · ${order.type}`,
      meta: `${order.etaLabel} ETA${order.tableNumber ? ` · ${order.tableNumber}` : ""}`,
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

  const updateKitchenOrder = useCallback(async (order: TableOrder, targetStatus?: TableOrderStatus) => {
    const status = targetStatus ?? nextKitchenStatus[order.status];
    if (!status || status === order.status) return;
    const previous = tableOrdersRef.current;
    setTableOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    const response = await fetch("/api/owner/kitchen", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: order.id, status }),
    }).catch(() => null);
    try {
      if (!response) throw new Error("Kitchen connection is unavailable.");
      const payload = await readOwnerPayload<{ data?: TableOrder }>(response, "Kitchen status could not be updated.");
      if (payload.data) setTableOrders((current) => current.map((item) => item.id === order.id ? payload.data! : item));
      toast.success(orderStatusToast(status));
    } catch (error) {
      setTableOrders(previous);
      toast.error(error instanceof Error ? error.message : "Kitchen status could not be updated.");
    }
  }, []);

  const retryOwnerOrders = useCallback(() => setDateRange((current) => ({ ...current })), []);

  const canonicalOrderIdFor = useCallback((order: OperationalOrder) => (
    order.canonicalOrderId ?? orders.find((item) => item.kitchenOrderId === order.id)?.id ?? order.id
  ), [orders]);

  const sendOwnerOrderToKitchen = useCallback(async (order: OperationalOrder) => {
    const orderId = canonicalOrderIdFor(order);
    setActiveAction(`accept:${order.id}`);
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "send_to_kitchen", operationKey: clientOperationKey(["owner-send-to-kitchen", orderId, order.id]), orderId }),
      });
      await readOwnerPayload(response, "Order could not be sent to Kitchen.");
      retryOwnerOrders();
      toast.success("Order sent to Kitchen.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Order could not be sent to Kitchen.");
    } finally {
      setActiveAction(null);
    }
  }, [canonicalOrderIdFor, retryOwnerOrders]);

  const advanceOwnerKitchen = useCallback(async (order: OperationalOrder, status: TableOrderStatus) => {
    if (status === "accepted" && order.hasKitchenTicket === false) {
      await sendOwnerOrderToKitchen(order);
      return;
    }
    if (["accepted", "preparing", "ready", "cancelled"].includes(status) && order.hasKitchenTicket !== false) {
      await updateKitchenOrder(order, status);
      return;
    }
    await updateOrder(canonicalOrderIdFor(order), status as OrderStatus);
  }, [canonicalOrderIdFor, sendOwnerOrderToKitchen, updateKitchenOrder, updateOrder]);

  const notifyOwnerWaiter = useCallback(async (order: OperationalOrder) => {
    if (order.status !== "ready" || order.hasKitchenTicket === false) return toast.error("Only a ready kitchen order can send a floor signal.");
    setActiveAction(`notify:${order.id}`);
    try {
      const response = await fetch("/api/owner/kitchen/notify-waiter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kitchenOrderId: order.id,
          orderId: canonicalOrderIdFor(order),
          orderNumber: readableTableOrderId(order),
          tableNumber: order.tableNumber,
          waiterName: order.waiterName || order.assignedStaffName,
          branchId: order.branchId,
          notificationMethod: "both",
          sound: operationalSettings.notificationSounds.readyForPickup.sound,
        }),
      });
      await readOwnerPayload(response, "Ready signal could not be sent.");
      toast.success("Ready signal sent. Waiter view updates live.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ready signal could not be sent.");
    } finally {
      setActiveAction(null);
    }
  }, [canonicalOrderIdFor, operationalSettings.notificationSounds.readyForPickup.sound]);

  const collectOwnerPayment = useCallback(async (order: OperationalOrder) => {
    const orderId = canonicalOrderIdFor(order);
    const due = Math.max(0, Number(order.total ?? 0) - Number(order.paidAmount ?? 0));
    const input = await alert.prompt("Enter the amount collected.", {
      title: "Collect payment",
      inputLabel: "Amount",
      placeholder: String(due || order.total || 0),
      confirmText: "Record payment",
      tone: "success",
    });
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid payment amount.");
    let locked = false;
    setActiveAction(`payment:${order.id}`);
    try {
      const started = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "payment_started", operationKey: clientOperationKey(["owner-payment-start", orderId, order.id, amount]), orderId, kitchenOrderId: order.hasKitchenTicket === false ? undefined : order.id, amount, method: "cash" }),
      });
      await readOwnerPayload(started, "Payment verification could not be saved.");
      locked = true;
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "payment", operationKey: clientOperationKey(["owner-payment", orderId, order.id, amount]), orderId, kitchenOrderId: order.hasKitchenTicket === false ? undefined : order.id, amount, method: "cash" }),
      });
      await readOwnerPayload(response, "Payment could not be recorded.");
      retryOwnerOrders();
      toast.success(amount + 0.01 < Number(order.total ?? 0) ? "Partial payment recorded." : "Payment recorded.");
    } catch (error) {
      if (locked) {
        await fetch("/api/owner/orders", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "payment_unlock", operationKey: clientOperationKey(["owner-payment-unlock", orderId, order.id, amount]), orderId, kitchenOrderId: order.hasKitchenTicket === false ? undefined : order.id, reason: "Payment recording failed before completion." }),
        }).catch(() => undefined);
      }
      toast.error(error instanceof Error ? error.message : "Payment could not be recorded.");
    } finally {
      setActiveAction(null);
    }
  }, [alert, canonicalOrderIdFor, retryOwnerOrders]);

  const remindOwnerKitchen = useCallback(async (order: OperationalOrder, kind: "reminder" | "recall") => {
    const label = kind === "recall" ? "Kitchen recall" : "Kitchen reminder";
    if (order.hasKitchenTicket === false) return toast.error(`${label} cannot be sent because the kitchen ticket is unavailable.`);
    setActiveAction(`${kind}:${order.id}`);
    try {
      const requestedAt = new Date().toISOString();
      const kitchenResponse = await fetch("/api/owner/kitchen", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.id, operationKey: clientOperationKey([`owner-${kind}`, order.id, requestedAt]), priority: "rush", reminderAt: requestedAt }),
      });
      await readOwnerPayload(kitchenResponse, `${label} could not be sent.`);
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "event", operationKey: clientOperationKey(["owner-order-event", canonicalOrderIdFor(order), kind, requestedAt]), event: kind === "recall" ? "kitchen_recall" : "reminder", orderId: canonicalOrderIdFor(order), kitchenOrderId: order.id, note: `${label} sent` }),
      });
      await readOwnerPayload(response, `${label} history could not be saved.`);
      retryOwnerOrders();
      toast.success(`${label} sent.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${label} could not be sent.`);
    } finally {
      setActiveAction(null);
    }
  }, [canonicalOrderIdFor, retryOwnerOrders]);

  const promptOwnerTransfer = useCallback(async (order: OperationalOrder, mode: "table" | "waiter") => {
    const value = await alert.prompt(mode === "waiter" ? "Enter waiter name." : "Enter target table.", {
      title: mode === "waiter" ? "Assign waiter" : "Transfer table",
      inputLabel: mode === "waiter" ? "Waiter" : "Table",
      confirmText: mode === "waiter" ? "Assign" : "Transfer",
    });
    const text = value?.trim();
    if (!text) return;
    setActiveAction(`transfer:${order.id}`);
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: mode === "waiter" ? "assign_waiter" : "transfer_table",
          operationKey: clientOperationKey(["owner-transfer", canonicalOrderIdFor(order), mode, text]),
          orderId: canonicalOrderIdFor(order),
          kitchenOrderId: order.hasKitchenTicket === false ? undefined : order.id,
          tableNumber: mode === "table" ? text : order.tableNumber,
          waiterName: mode === "waiter" ? text : order.waiterName,
        }),
      });
      await readOwnerPayload(response, mode === "waiter" ? "Waiter assignment could not be saved." : "Table transfer could not be saved.");
      retryOwnerOrders();
      toast.success(mode === "waiter" ? `${text} assigned.` : `Moved to ${text}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : mode === "waiter" ? "Waiter assignment could not be saved." : "Table transfer could not be saved.");
    } finally {
      setActiveAction(null);
    }
  }, [alert, canonicalOrderIdFor, retryOwnerOrders]);

  const handoffToPos = useCallback((order: OperationalOrder, action: string) => {
    window.sessionStorage.setItem(activeOrderHandoffKey, JSON.stringify({ orderId: order.id, action, at: Date.now() }));
    window.location.assign("/owner/pos?panel=active");
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-950">{activeView ? "Active Orders" : "Orders"}</h1>
          <p className="mt-2 text-base font-medium text-slate-600">Manage live restaurant orders across waiter, kitchen, cashier, and partner channels.</p>
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
                {orderTabs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger key={item.key} value={item.key} className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:shadow-none">
                      <Icon className="size-4" />
                      {item.label}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">{tabCounts[item.key]}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-3 pb-3">
              <span className="text-sm font-black text-neutral-950">Auto-accept</span>
              <button
                type="button"
                onClick={() => setAutoAccept((value) => !value)}
                title="Quickly pause or resume auto-accept. Configure rules in Settings."
                className={autoAccept ? "h-11 w-16 rounded-full bg-orange-500 p-1" : "h-11 w-16 rounded-full bg-slate-300 p-1"}
                aria-pressed={autoAccept}
              >
                <span className={autoAccept ? "block size-9 translate-x-5 rounded-full bg-white transition" : "block size-9 rounded-full bg-white transition"} />
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

          {!activeView ? <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-24 text-sm font-bold text-slate-950 outline-none focus:border-orange-400" placeholder="Search orders, tables, customers, items, waiters" aria-label="Search active orders by order, table, customer, item, waiter, phone, or date" />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500 sm:inline-flex">{visibleOrders.length} match{visibleOrders.length === 1 ? "" : "es"}</span>
          </label> : null}

          {!activeView ? <OrderFilters filters={filters} active={filter} onChange={setFilter} /> : null}
          {!activeView ? <ActiveOrderStatusBoard summary={activeSummary} /> : null}

          <div className="space-y-4">
            {visibleCatering.length ? (
              <CateringInquiryList
                inquiries={visibleCatering}
              />
            ) : null}
            {activeView ? (
              <ActiveOrdersPanel
                orders={orders}
                kitchenOrders={visibleUnifiedActiveOrders}
                tables={[]}
                staff={[]}
                loading={loading}
                error={loadError}
                orderDelayThresholdMinutes={operationalSettings.orderDelayThresholdMinutes}
                readySound={operationalSettings.notificationSounds.readyForPickup}
                onRetry={retryOwnerOrders}
                onOpenNew={() => window.location.assign("/owner/pos?panel=new")}
                onOpen={(order) => handoffToPos(order, "preview")}
                onAddItems={(order) => handoffToPos(order, "add")}
                onPrintBill={(order) => handoffToPos(order, "print-bill")}
                onPrintReceipt={(order) => handoffToPos(order, "print-receipt")}
                onPrintKot={(order) => handoffToPos(order, "print-kot")}
                onCollectPayment={(order) => void collectOwnerPayment(order)}
                onNotifyWaiter={(order) => void notifyOwnerWaiter(order)}
                onSplit={(order) => handoffToPos(order, "split")}
                onTransfer={(order) => void promptOwnerTransfer(order, "table")}
                onAssignWaiter={(order) => void promptOwnerTransfer(order, "waiter")}
                onMerge={(order) => handoffToPos(order, "merge")}
                onTimeline={(order) => handoffToPos(order, "timeline")}
                onPaymentHistory={(order) => handoffToPos(order, "history")}
                onAdvanceKitchen={(order, status) => void advanceOwnerKitchen(order, status)}
                onReminder={(order) => void remindOwnerKitchen(order, "reminder")}
                onRecall={(order) => void remindOwnerKitchen(order, "recall")}
                onServe={(order) => void updateOrder(canonicalOrderIdFor(order), "served")}
                onComplete={(order) => void updateOrder(canonicalOrderIdFor(order), "completed")}
                onCancel={(order) => void advanceOwnerKitchen(order, "cancelled")}
                activeAction={activeAction}
              />
            ) : visibleOrders.length ? (
              <ActiveOrdersGrid
                orders={visibleOrders}
                loading={loading}
                highlightedOrderIds={highlightedOrderIds}
                limit={80}
                onAccept={(order) => order.kitchenOrder ? void updateKitchenOrder(order.kitchenOrder, "accepted") : void updateOrder(order.id, "accepted")}
                onReject={(order) => void rejectKitchenOrder(order)}
                onReady={(order) => {
                  const status = order.status === "accepted" ? "preparing" : "ready";
                  return order.kitchenOrder ? void updateKitchenOrder(order.kitchenOrder, status) : void updateOrder(order.id, status);
                }}
                onComplete={serveOrder}
                onView={focusOrder}
              />
            ) : null}
            {!loading && !visibleOrders.length && !visibleCatering.length && !activeView ? <EmptyOrders /> : null}
            {!loading && activeView && !activeOrders.length && !visibleCatering.length ? <EmptyOrders title="No active orders" /> : null}
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

function ActiveOrderStatusBoard({ summary }: { summary: ActiveOrderSummary }) {
  const cards = [
    { label: "With Waiter", value: summary.withWaiter, note: "Not sent to kitchen", icon: Users, tone: "blue" },
    { label: "In Kitchen", value: summary.inKitchen, note: "Cooking in progress", icon: ChefHat, tone: "orange" },
    { label: "Ready To Serve", value: summary.ready, note: "Ready for service", icon: Utensils, tone: "green" },
    { label: "Served", value: summary.served, note: "Ready for completion", icon: PackageCheck, tone: "purple" },
    { label: "Pending Bills", value: summary.pendingBills, note: "Payment pending", icon: ReceiptText, tone: "amber" },
    { label: "Delayed", value: summary.delayed, note: "Beyond ETA", icon: AlertTriangle, tone: "red" },
  ] as const;
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Active order status summary">
      {cards.map((card) => {
        const Icon = card.icon;
        const tone = summaryCardTone(card.tone);
        return (
          <div key={card.label} className={cn("rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", tone.border)}>
            <div className="flex items-center gap-3">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tone.bg, tone.text)}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black uppercase text-slate-500">{card.label}</p>
                <p className="mt-0.5 text-2xl font-black text-slate-950">{card.value}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{card.note}</p>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ActiveOrdersGrid({
  orders,
  loading = false,
  highlightedOrderIds,
  limit = 30,
  onAccept,
  onReject,
  onReady,
  onComplete,
  onView,
}: {
  orders: ActiveOpsOrder[];
  loading?: boolean;
  highlightedOrderIds: Set<string>;
  limit?: number;
  onAccept: (order: ActiveOpsOrder) => void;
  onReject: (order: ActiveOpsOrder) => void;
  onReady: (order: ActiveOpsOrder) => void;
  onComplete: (order: ActiveOpsOrder) => void;
  onView: (order: ActiveOpsOrder) => void;
}) {
  const visible = orders.slice(0, limit);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Active orders workspace">
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950">Operational Queue</p>
          <p className="text-xs font-semibold text-slate-500">{visible.length} visible of {orders.length} active order{orders.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-black">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500 kitchen-ready-pulse" />
            Live
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">Newest first</span>
        </div>
      </div>
      <div className="grid gap-2 p-2 xl:p-3">
        {loading && !visible.length ? Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-3" aria-hidden="true">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-3/4 rounded bg-slate-200" />
            <div className="mt-4 h-8 rounded bg-slate-100" />
          </div>
        )) : visible.map((order) => (
          <MemoActiveOrderCard
            key={order.id}
            order={order}
            highlighted={highlightedOrderIds.has(order.id)}
            expanded={expandedOrderId === order.id}
            onAccept={() => onAccept(order)}
            onReject={() => onReject(order)}
            onReady={() => onReady(order)}
            onComplete={() => onComplete(order)}
            onExpandedChange={(open) => setExpandedOrderId(open ? order.id : null)}
            onView={() => onView(order)}
          />
        ))}
      </div>
      {orders.length > visible.length ? <p className="border-t bg-slate-50 p-3 text-center text-sm font-bold text-slate-500">Showing latest {visible.length} active orders. Use search or filters for older active orders.</p> : null}
    </section>
  );
}

function ActiveOrderCard({
  order,
  highlighted,
  expanded,
  onAccept,
  onReject,
  onReady,
  onComplete,
  onExpandedChange,
  onView,
}: {
  order: ActiveOpsOrder;
  highlighted: boolean;
  expanded: boolean;
  onAccept: () => void;
  onReject: () => void;
  onReady: () => void;
  onComplete: () => void;
  onExpandedChange: (open: boolean) => void;
  onView: () => void;
}) {
  const delayed = Boolean(order.delay?.delayed);
  const critical = order.delay?.priority === "critical";
  const ready = order.status === "ready";
  const served = order.status === "served";
  const isNew = order.status === "new";
  const accepted = order.status === "accepted";
  const preparing = order.status === "preparing";
  const [mobileQuickOpen, setMobileQuickOpen] = useState(false);
  const primaryAction = isNew
    ? { label: "Accept Order", onClick: onAccept }
    : accepted
      ? { label: "Start Cooking", onClick: onReady }
      : preparing
      ? { label: "Mark Ready", onClick: onReady }
      : ready
        ? { label: "Serve Order", onClick: onComplete }
        : null;
  const paid = order.paymentStatusLabel.toLowerCase().includes("paid");
  const progress = orderProgressPercent(order.status);
  const openDetails = () => {
    onExpandedChange(true);
    setMobileQuickOpen(true);
    onView();
  };
  return (
    <>
      <div className="hidden xl:block">
        <CompactOrderAccordion
          id={`active-order-${order.id}`}
          orderNumber={order.displayId ?? "Order"}
          etaLabel={delayed ? `${formatDelayTime(order.delay?.lateMinutes ?? 0).label} late` : order.etaLabel}
          orderTypeLabel={order.type}
          tableLabel={order.tableNumber || order.customer}
          itemCountLabel={`${order.itemCount} item${order.itemCount === 1 ? "" : "s"}`}
          status={{ label: order.status, tone: ownerStatusTone(order.status) }}
          accent={ownerAccordionAccent(order)}
          priority={{ label: order.priorityLabel, tone: ownerPriorityTone(order.delay?.priority), icon: delayed || critical ? <AlertTriangle className="size-3.5" /> : <Timer className="size-3.5" /> }}
          badges={[
            { label: order.source, tone: "muted" },
            { label: kotCountLabel(order), tone: order.kitchenOrder ? "info" : "muted" },
            { label: order.paymentStatusLabel, tone: paid ? "success" : "default" },
          ]}
          workflow={buildOwnerWorkflow(order)}
          sideStats={[
            { label: delayed ? "Delayed" : ready ? "Ready" : "ETA", value: delayed ? formatDelayTime(order.delay?.lateMinutes ?? 0).label : ready ? order.age : order.etaLabel, tone: delayed ? "danger" : ready ? "success" : "default" },
            { label: "Total", value: formatCurrency(order.total), tone: paid ? "success" : "default" },
          ]}
          delay={ownerAccordionDelay(order)}
          items={order.lines.map((line, index) => ({
            id: `${order.id}-${index}`,
            name: line.name,
            quantity: line.quantity,
            note: line.notes,
            meta: line.modifiers?.join(", "),
            warning: line.allergyNote ? `Allergy: ${line.allergyNote}` : undefined,
          }))}
          facts={[
            { label: "Customer", value: order.customer },
            { label: "Phone", value: order.phone || "Not provided" },
            { label: "Table / Waiter", value: [order.tableNumber, order.kitchenOrder?.waiterName].filter(Boolean).join(" / ") || order.type },
            { label: "Kitchen", value: order.kitchenStatus },
            { label: "KOT", value: kotCountLabel(order) },
            { label: "Payment", value: order.paymentStatusLabel, tone: paid ? "success" : "default" },
            { label: "Waiting", value: order.age, tone: delayed ? "danger" : "default" },
            { label: "Total", value: formatCurrency(order.total) },
          ]}
          notes={[order.instructions, order.scheduledLabel, order.prepSuggestion].filter(isStringValue)}
          timeline={order.timeline.map((entry) => ({ label: entry.label, time: entry.at }))}
          progress={{ label: "Kitchen progress", value: progress, helper: kitchenProgressHelper(order), tone: delayed ? "danger" : ready || served ? "success" : preparing ? "default" : "warning" }}
          primaryAction={primaryAction ? {
            id: "primary",
            label: primaryAction.label,
            icon: <CheckCircle2 className="size-4" />,
            variant: "primary",
            onClick: primaryAction.onClick,
          } : undefined}
          secondaryActions={[
            { id: "view", label: "View / Preview", icon: <Eye className="size-4" />, onClick: openDetails },
          ]}
          moreActions={[
            ...(isNew ? [{ id: "reject", label: "Reject", icon: <AlertTriangle className="size-4" />, variant: "danger" as const, onClick: onReject }] : []),
          ]}
          isOpen={expanded}
          highlighted={highlighted}
          onOpenChange={onExpandedChange}
        />
      </div>
      <article className={cn("grid gap-3 px-3 py-2.5 transition xl:hidden", isNew && "border-l-4 border-orange-500 bg-orange-50/45 kitchen-new-order-pulse", delayed && "bg-red-50/75", ready && "bg-emerald-50/65", critical && "ring-1 ring-inset ring-red-300", highlighted && "ring-2 ring-inset ring-orange-400")}>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-base font-black text-slate-950">{order.displayId ?? "Order"}</p>
          <OperationalOrderStatusBadge status={order.status} className={cn(delayed && "order-delay-soft-blink")} />
        </div>
        <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{order.customer} · {order.tableNumber || order.type} · {order.source}</p>
      </div>
      <OrderCell label="Priority" value={order.priorityLabel} tone={critical || delayed ? "danger" : "default"}>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black", priorityTone(order.delay?.priority))}>
          {delayed || critical ? <AlertTriangle className="size-3.5" /> : <Timer className="size-3.5" />}
          {order.delay?.lateMinutes ? formatDelayTime(order.delay.lateMinutes).label : "On time"}
        </span>
      </OrderCell>
      <OrderCell label="Progress" value={order.kitchenStatus} subvalue={`${order.itemCount} item${order.itemCount === 1 ? "" : "s"} · ${order.itemSummary}`} strong>
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
          <span className={cn("block h-full rounded-full", ready ? "bg-emerald-500" : preparing ? "bg-blue-500" : isNew ? "bg-orange-500" : "bg-slate-400")} style={{ width: `${orderProgressPercent(order.status)}%` }} />
        </span>
      </OrderCell>
      <OrderCell label="ETA" value={delayed ? `${formatDelayTime(order.delay?.lateMinutes ?? 0).label} late` : order.etaLabel} subvalue={order.age} tone={delayed ? "danger" : ready ? "success" : "default"} blink={delayed} />
      <MobileWorkflowSteps order={order} />
      <QuickViewCell order={order} mobileOpen={mobileQuickOpen} onMobileToggle={() => setMobileQuickOpen((value) => !value)} />
      <div className="flex items-center gap-2 xl:justify-end">
        {primaryAction ? (
          <Button size="sm" variant={primaryAction.label === "Serve" ? "default" : "outline"} className={cn("min-h-11", delayed && primaryAction.label === "Serve" && "order-delay-soft-blink")} onClick={primaryAction.onClick}>
            <CheckCircle2 className="size-4" />
            {primaryAction.label}
          </Button>
        ) : null}
        <ActiveOrderMenu
          isNew={isNew}
          accepted={accepted}
          preparing={preparing}
          ready={ready}
          onAccept={onAccept}
          onReject={onReject}
          onReady={onReady}
          onComplete={onComplete}
          onView={openDetails}
        />
      </div>
      {mobileQuickOpen ? <div className="xl:hidden"><QuickViewContent order={order} /></div> : null}
      </article>
    </>
  );
}

const MemoActiveOrderCard = memo(ActiveOrderCard);

function MobileWorkflowSteps({ order }: { order: ActiveOpsOrder }) {
  const workflow = buildOwnerWorkflow(order);
  return (
    <div className="grid grid-cols-6 gap-1 xl:hidden" aria-label={`${order.displayId ?? "Order"} workflow`}>
      {workflow.map((step) => (
        <span key={step.id} className="grid min-w-0 justify-items-center gap-1">
          <span className={cn("grid size-6 place-items-center rounded-full border text-[10px] font-black", step.state === "complete" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : step.state === "active" ? "border-orange-200 bg-orange-50 text-orange-700" : step.state === "blocked" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-400")}>
            {step.icon}
          </span>
          <span className="w-full truncate text-center text-[9px] font-black text-slate-500">{step.label.split(" ")[0]}</span>
        </span>
      ))}
    </div>
  );
}

function ActiveOrderMenu({
  isNew,
  accepted,
  preparing,
  ready,
  onAccept,
  onReject,
  onReady,
  onComplete,
  onView,
}: {
  isNew: boolean;
  accepted: boolean;
  preparing: boolean;
  ready: boolean;
  onAccept: () => void;
  onReject: () => void;
  onReady: () => void;
  onComplete: () => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  const act = (fn: () => void) => () => {
    close();
    fn();
  };
  const actions = [
    ...(isNew ? [{ label: "Accept", onClick: onAccept }, { label: "Reject", onClick: onReject, danger: true }] : []),
    ...(accepted ? [{ label: "Start Cooking", onClick: onReady }] : []),
    ...(preparing ? [{ label: "Mark Ready", onClick: onReady }] : []),
    ...(ready ? [{ label: "Serve", onClick: onComplete }] : []),
    { label: "View / Preview", onClick: onView },
  ];
  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? []);
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const index = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (current + 1 + items.length) % items.length
          : (current - 1 + items.length) % items.length;
    items[index]?.focus();
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="icon-sm" variant="outline" className="size-11" aria-label="More actions" title="More actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={menuRef}
          align="end"
          sideOffset={8}
          collisionPadding={12}
          onKeyDown={handleMenuKeyDown}
          className="z-[70] max-h-80 w-52 overflow-y-auto rounded-xl border border-white/50 bg-white/90 p-1 shadow-2xl backdrop-blur data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={cn("flex min-h-11 w-full items-center rounded-lg px-3 text-left text-xs font-black hover:bg-slate-50", action.danger ? "text-red-600" : "text-slate-700")}
              onClick={act(action.onClick)}
            >
              {action.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function QuickViewCell({ order, mobileOpen, onMobileToggle }: { order: ActiveOpsOrder; mobileOpen: boolean; onMobileToggle: () => void }) {
  return (
    <div className="flex items-center xl:justify-center">
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button size="icon-sm" variant="outline" className="hidden size-11 xl:inline-flex" aria-label={`View ${order.displayId ?? order.id}`} title="Quick view">
            <Eye className="size-4" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="center"
            sideOffset={8}
            collisionPadding={12}
            onOpenAutoFocus={(event) => event.preventDefault()}
            className="z-[70] max-h-[min(78vh,42rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/50 bg-white/80 p-4 shadow-2xl backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <QuickViewContent order={order} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <Button size="sm" variant="outline" className="min-h-11 xl:hidden" onClick={onMobileToggle} aria-expanded={mobileOpen}>
        <Eye className="size-4" />
        View
      </Button>
    </div>
  );
}

function QuickViewContent({ order }: { order: ActiveOpsOrder }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-xs font-black uppercase text-orange-600">Quick view</p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate text-xl font-black text-slate-950">{order.displayId ?? order.id}</h3>
          <OperationalOrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 font-semibold text-slate-600">{order.customer || "Customer"} · {order.tableNumber || order.type}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <QuickFact label="Payment" value={`${order.paymentStatusLabel} · ${formatCurrency(order.total)}`} />
        <QuickFact label="Kitchen" value={order.kitchenStatus} />
        <QuickFact label="ETA" value={order.delay?.delayed ? `${formatDelayTime(order.delay.lateMinutes).label} late` : order.etaLabel} tone={order.delay?.delayed ? "danger" : undefined} />
        <QuickFact label="Order time" value={order.actualTime || "-"} />
        <QuickFact label="Waiting" value={order.age} tone={order.delay?.delayed ? "danger" : undefined} />
        <QuickFact label="Priority" value={order.priorityLabel} tone={order.delay?.delayed ? "danger" : undefined} />
      </div>

      <div className="rounded-xl border border-white/60 bg-white/70 p-3">
        <p className="text-xs font-black uppercase text-slate-500">Items</p>
        <div className="mt-2 space-y-2">
          {order.lines.map((line, index) => (
            <div key={`${line.name}-${index}`} className="rounded-lg bg-slate-50 p-2">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-black text-slate-950">{line.name}</p>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-700">x{line.quantity}</span>
              </div>
              {line.modifiers?.length ? <p className="mt-1 text-xs font-bold text-orange-700">{line.modifiers.join(", ")}</p> : null}
              {line.notes ? <p className="mt-1 text-xs font-semibold text-slate-600">Note: {line.notes}</p> : null}
              {line.allergyNote ? <p className="mt-1 text-xs font-black text-red-700">Allergy: {line.allergyNote}</p> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/60 bg-white/70 p-3">
        <p className="text-xs font-black uppercase text-slate-500">Timeline</p>
        <div className="mt-2 space-y-2">
          {order.timeline.map((item, index) => (
            <div key={`${item.label}-${index}`} className="grid grid-cols-[7px_1fr] gap-2">
              <span className="mt-1.5 size-1.5 rounded-full bg-orange-500" />
              <p className="font-semibold text-slate-700"><span className="font-black text-slate-950">{item.label}</span>{item.at ? ` · ${item.at}` : ""}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickFact({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/60 bg-white/70 p-2">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className={cn("mt-1 truncate font-black text-slate-900", tone === "danger" && "text-red-700")}>{value}</p>
    </div>
  );
}

function OrderCell({ label, value, subvalue, strong, tone = "default", blink, children }: { label: string; value: string; subvalue?: string; strong?: boolean; tone?: "default" | "success" | "danger"; blink?: boolean; children?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase text-slate-400 xl:hidden">{label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <p className={cn("truncate text-sm font-black", strong ? "text-slate-950" : tone === "success" ? "text-emerald-700" : tone === "danger" ? "text-red-700" : "text-slate-700", blink && "order-delay-soft-blink")}>{value || "-"}</p>
        {children}
      </div>
      {subvalue ? <p className="truncate text-xs font-semibold text-slate-500">{subvalue}</p> : null}
    </div>
  );
}

function CateringInquiryList({
  inquiries,
}: {
  inquiries: CateringQuote[];
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
    toast.success("Quote email draft opened.");
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
              <Button className="mt-2 w-full" variant="outline" disabled title="Catering conversion requires a repository-backed workflow before it can be enabled.">
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

function clientOperationKey(parts: unknown[]) {
  const text = JSON.stringify(parts);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `owner-${(hash >>> 0).toString(36)}`;
}

function dateRangeQuery(range: DateRange) {
  const params = new URLSearchParams();
  params.set("from", range.from);
  params.set("to", range.to);
  params.set("limit", "300");
  return params.toString();
}

function matchesLiveDateRange(createdAt: string, scheduledFor: string | undefined, range: DateRange) {
  const from = Date.parse(`${range.from}T00:00:00`);
  const to = Date.parse(`${range.to}T23:59:59.999`);
  const created = Date.parse(createdAt);
  const scheduled = scheduledFor ? Date.parse(scheduledFor) : Number.NaN;
  return (Number.isFinite(created) && created >= from && created <= to) || (Number.isFinite(scheduled) && scheduled >= from && scheduled <= to);
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

function buildOpsOrders(orders: DemoOrder[], tableOrders: TableOrder[], now: number, orderDelayThresholdMinutes: number): ActiveOpsOrder[] {
  const countByPhone = new Map<string, number>();
  for (const order of orders) {
    const phone = normalizePhone(order.customer.phone);
    if (phone) countByPhone.set(phone, (countByPhone.get(phone) ?? 0) + 1);
  }
  const ordersByKitchen = new Map(orders.filter((order) => order.kitchenOrderId).map((order) => [order.kitchenOrderId, order]));
  const linkedKitchenIds = new Set(tableOrders.map((order) => order.id));
  const customerOrders = orders.filter((order) => !order.kitchenOrderId || !linkedKitchenIds.has(order.kitchenOrderId)).map((order, index) => {
    const delay = getKitchenDelay({ status: order.status, createdAt: order.createdAt, prepEstimateMinutes: order.prepEstimateMinutes }, now, { orderDelayThresholdMinutes });
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
      itemSummary: compactItems(order.lines),
      lines: order.lines,
      timeline: compactTimeline(order.status, order.createdAt, actualOrderTime(order.createdAt)),
      kitchenStatus: kitchenStatusLabel(order.status),
      paymentStatusLabel: paymentStatusLabel(order.paymentStatus),
      priorityLabel: priorityLabel(delay.priority),
      isOnline: !["POS", "Catering"].includes(sourceLabel(order.channel)),
    };
  });
  const kotOrders = tableOrders.map((order, index) => {
    const canonical = ordersByKitchen.get(order.id);
    const status = serviceStatusForKitchenOrder(order.status, canonical?.status, (canonical as (DemoOrder & { mergedIntoOrderId?: string }) | undefined)?.mergedIntoOrderId);
    const paymentStatus = canonical?.paymentStatus ?? order.paymentStatus;
    const lines = canonical?.lines ?? order.lines;
    const delay = getKitchenDelay({ ...order, status }, now, { orderDelayThresholdMinutes });
    const displayOrder = {
      ...order,
      orderNumber: canonical?.orderNumber ?? order.orderNumber,
      displayOrderNumber: canonical?.displayOrderNumber ?? order.displayOrderNumber,
      invoiceNumber: canonical?.invoiceNumber ?? order.invoiceNumber,
      billNumber: canonical?.billNumber ?? order.billNumber,
    };
    return {
      delay,
      id: order.id,
      canonicalOrderId: canonical?.id,
      displayId: readableTableOrderId(displayOrder, index + 1),
      age: relativeOrderTime(order.createdAt, now),
      actualTime: actualOrderTime(order.createdAt),
      source: order.source === "Delivery" ? "POS Delivery" : order.source === "Parcel" ? "POS Parcel" : "POS",
      customer: canonical?.customer.name || order.customerName || order.guestName || order.tableNumber,
      phone: canonical?.customer.phone || order.customerPhone || "",
      address: canonical?.customer.address || order.deliveryAddress,
      previousOrderCount: countByPhone.get(normalizePhone(canonical?.customer.phone || order.customerPhone || "")) ?? 0,
      type: canonical?.fulfillmentType ?? order.orderType ?? "dine-in",
      tableNumber: order.orderType === "dine-in" ? order.tableNumber : (canonical as (DemoOrder & { tableNumber?: string }) | undefined)?.tableNumber,
      status,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      total: canonical?.totals.total ?? order.total ?? lines.reduce((sum, line) => sum + line.quantity * line.price, 0),
      payment: canonical?.payment === "cod" ? "Cash" : canonical?.payment ? canonical.payment.toUpperCase() : "Pending",
      scheduledLabel: (canonical?.scheduledFor ?? order.scheduledFor) ? `Delivery at ${new Date(canonical?.scheduledFor ?? order.scheduledFor ?? "").toLocaleString("en-IN", { timeStyle: "short", dateStyle: "medium" })}` : undefined,
      createdAtMs: timestampMs(order.createdAt),
      etaLabel: `${canonical?.prepEstimateMinutes ?? order.etaMinutes ?? 15} min`,
      itemSummary: compactItems(lines),
      lines,
      timeline: compactTimeline(status, order.createdAt, actualOrderTime(order.createdAt), order.statusHistory),
      kitchenStatus: kitchenStatusLabel(status),
      paymentStatusLabel: paymentStatusLabel(paymentStatus),
      priorityLabel: priorityLabel(delay.priority),
      isOnline: order.source === "QR" || order.source === "Waiter",
      kitchenOrder: { ...displayOrder, status, paymentStatus },
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

function buildTabCounts(orders: ActiveOpsOrder[], cateringInquiries: CateringQuote[]): Record<OrderTab, number> {
  return {
    all: orders.filter((order) => matchesTab(order, "all")).length,
    "dine-in": orders.filter((order) => matchesTab(order, "dine-in")).length,
    parcel: orders.filter((order) => matchesTab(order, "parcel")).length,
    delivery: orders.filter((order) => matchesTab(order, "delivery")).length,
    online: orders.filter((order) => matchesTab(order, "online")).length,
    qr: orders.filter((order) => matchesTab(order, "qr")).length,
    scheduled: orders.filter((order) => matchesTab(order, "scheduled")).length + cateringInquiries.filter((quote) => matchesCateringTab(quote, "scheduled")).length,
    catering: cateringInquiries.filter((quote) => matchesCateringTab(quote, "catering")).length,
    cancelled: orders.filter((order) => matchesTab(order, "cancelled")).length + cateringInquiries.filter((quote) => matchesCateringTab(quote, "cancelled")).length,
  };
}

function buildActiveOrderSummary(orders: ActiveOpsOrder[]): ActiveOrderSummary {
  return {
    withWaiter: orders.filter((order) => !order.kitchenOrder || ["new", "occupied"].includes(order.status)).length,
    inKitchen: orders.filter((order) => ["accepted", "preparing"].includes(order.status)).length,
    ready: orders.filter((order) => order.status === "ready").length,
    served: orders.filter((order) => order.status === "served").length,
    pendingBills: orders.filter((order) => !order.paymentStatusLabel.toLowerCase().includes("paid") && !["cancelled", "rejected", "completed", "delivered"].includes(order.status)).length,
    delayed: orders.filter((order) => order.delay?.delayed).length,
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
  if (tab === "all") return !["delivered", "completed", "cancelled", "rejected"].includes(order.status);
  if (tab === "dine-in") return order.type === "dine-in";
  if (tab === "parcel") return order.type === "parcel" || order.source === "Parcel";
  if (tab === "delivery") return order.type === "delivery" || order.source === "Delivery";
  if (tab === "online") return ["Website", "Zomato", "Swiggy", "Magicpin", "ONDC", "Delivery"].includes(order.source);
  if (tab === "qr") return order.source === "QR";
  if (tab === "scheduled") return Boolean(order.scheduledLabel) || order.source === "Catering";
  if (tab === "catering") return order.source === "Catering";
  if (tab === "cancelled") return ["cancelled", "rejected"].includes(order.status);
  return !["delivered", "completed", "cancelled", "rejected"].includes(order.status);
}

function matchesOperationalTab(order: OperationalOrder, tab: OrderTab) {
  if (tab === "all") return !["completed", "cancelled", "billed"].includes(order.status);
  if (tab === "dine-in") return order.orderType === "dine-in";
  if (tab === "parcel") return order.orderType === "parcel" || ["Parcel", "Takeaway"].includes(order.source);
  if (tab === "delivery") return order.orderType === "delivery" || order.source === "Delivery";
  if (tab === "online") return ["Delivery", "QR"].includes(order.source) || (order.hasKitchenTicket === false && order.orderType === "delivery");
  if (tab === "qr") return order.source === "QR";
  if (tab === "scheduled") return Boolean(order.scheduledFor);
  if (tab === "cancelled") return ["cancelled", "billed"].includes(order.status);
  return false;
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

function matchesSearch(order: ActiveOpsOrder, query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return true;
  return [
    order.displayId,
    order.customer,
    order.phone,
    order.email,
    order.address,
    order.type,
    order.source,
    order.status,
    order.scheduledLabel,
    order.itemSummary,
    order.tableNumber,
    order.kitchenOrder?.waiterName,
    order.kitchenOrder?.assignedStaffName,
    order.kitchenOrder?.kitchenStation,
    ...order.lines.map((line) => line.name),
  ].filter(Boolean).join(" ").toLowerCase().includes(search);
}

function matchesCateringSearch(quote: CateringQuote, query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return true;
  return [quote.id, quote.name, quote.phone, quote.email, quote.eventType, quote.eventDate, quote.eventTime].filter(Boolean).join(" ").toLowerCase().includes(search);
}

function matchesCateringTab(quote: CateringQuote, tab: OrderTab) {
  const status = quote.status ?? "new";
  if (tab === "catering") return true;
  if (tab === "cancelled") return status === "cancelled";
  return false;
}

function toDemoOrder(order: OrderDoc): DemoOrder {
  const demo: DemoOrder & { tableNumber?: string } = {
    id: order.id,
    orderNumber: order.orderNumber,
    displayOrderNumber: order.displayOrderNumber,
    invoiceNumber: order.invoiceNumber,
    billNumber: order.billNumber,
    restaurantSlug: order.restaurantId,
    customer: { name: order.customerName, phone: order.customerPhone, address: order.deliveryAddress ?? "" },
    lines: order.lines.map((line) => ({ itemId: line.menuItemId, name: line.name, price: line.price, quantity: line.quantity })),
    totals: { subtotal: order.subtotal, discount: order.discount, deliveryFee: order.deliveryFee, tax: order.tax, total: order.total },
    offerCode: order.offerCode,
    payment: "upi",
    paymentStatus: order.paymentStatus,
    channel: orderChannelLabel(order.channel),
    status: order.status === "draft" ? "new" : order.status,
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

function isStringValue(value: string | undefined): value is string {
  return Boolean(value);
}

function kitchenStatusLabel(status?: string) {
  if (!status) return "Not sent";
  return status.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function paymentStatusLabel(status?: string) {
  if (!status) return "Pending";
  return kitchenStatusLabel(status);
}

function compactItems(lines: DemoOrder["lines"] | TableOrder["lines"]) {
  const summary = lines.slice(0, 2).map((line) => `${line.quantity}x ${line.name}`).join(", ");
  const more = lines.length > 2 ? ` +${lines.length - 2}` : "";
  return `${summary}${more}`;
}

function compactTimeline(status: string, createdAt: string, createdLabel: string, history: TableOrder["statusHistory"] = []) {
  const entries = [...history]
    .reverse()
    .map((entry) => ({
      label: kitchenStatusLabel(String(entry.status ?? entry.foodStatus ?? entry.event ?? status)),
      at: formatTimelineTime(entry.at),
    }))
    .filter((entry) => entry.label)
    .filter((entry, index, values) => values.findIndex((value) => value.label === entry.label && value.at === entry.at) === index)
    .slice(0, 5);
  return [
    ...(entries.some((entry) => entry.label.toLowerCase() === kitchenStatusLabel(status).toLowerCase()) ? [] : [{ label: kitchenStatusLabel(status), at: "Now" }]),
    ...entries,
    { label: "Created", at: createdLabel || formatTimelineTime(createdAt) },
  ];
}

function formatTimelineTime(value: unknown) {
  const iso = formatFirestoreDateTime(value);
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";
}

function orderProgressPercent(status: string) {
  if (status === "new" || status === "occupied") return 15;
  if (status === "accepted") return 35;
  if (status === "preparing") return 65;
  if (status === "ready" || status === "served") return 90;
  if (status === "completed" || status === "delivered") return 100;
  return 25;
}

function buildOwnerWorkflow(order: ActiveOpsOrder) {
  const blocked = ["cancelled", "rejected"].includes(order.status);
  const sent = Boolean(order.kitchenOrder) || ["accepted", "preparing", "ready", "served", "completed", "delivered"].includes(order.status);
  const cooking = ["preparing", "ready", "served", "completed", "delivered"].includes(order.status);
  const ready = ["ready", "served", "completed", "delivered"].includes(order.status);
  const served = ["served", "completed", "delivered"].includes(order.status);
  const paid = order.paymentStatusLabel.toLowerCase().includes("paid");
  return [
    { id: "taken", label: "Order Taken", sublabel: timelineTime(order, ["created", "new"]) || order.actualTime, state: blocked ? "blocked" as const : "complete" as const, icon: <ClipboardList className="size-3.5" /> },
    { id: "sent", label: "Sent To Kitchen", sublabel: timelineTime(order, ["accepted", "sent"]), state: workflowState(sent, !sent && !blocked, blocked), icon: <CheckCircle2 className="size-3.5" /> },
    { id: "cooking", label: "Cooking", sublabel: timelineTime(order, ["preparing", "cooking"]), state: workflowState(cooking, sent && !cooking && !ready && !blocked, blocked), icon: <ChefHat className="size-3.5" /> },
    { id: "ready", label: "Ready", sublabel: timelineTime(order, ["ready"]), state: workflowState(ready, cooking && !ready && !blocked, blocked), icon: <Utensils className="size-3.5" /> },
    { id: "served", label: "Served", sublabel: timelineTime(order, ["served", "delivered"]), state: workflowState(served, ready && !served && !blocked, blocked), icon: <PackageCheck className="size-3.5" /> },
    { id: "paid", label: "Paid", sublabel: paid ? order.paymentStatusLabel : undefined, state: workflowState(paid, !paid && !blocked, blocked), icon: <ReceiptText className="size-3.5" /> },
  ];
}

function workflowState(complete: boolean, active: boolean, blocked: boolean) {
  if (blocked) return "blocked" as const;
  if (complete) return "complete" as const;
  if (active) return "active" as const;
  return "pending" as const;
}

function timelineTime(order: ActiveOpsOrder, needles: string[]) {
  const entry = order.timeline.find((item) => needles.some((needle) => item.label.toLowerCase().includes(needle)));
  return entry?.at;
}

function kitchenProgressHelper(order: ActiveOpsOrder) {
  if (order.delay?.delayed) return `${formatDelayTime(order.delay.lateMinutes).label} beyond ETA`;
  if (!order.kitchenOrder && order.status === "new") return "Not sent to kitchen";
  if (order.status === "ready") return "All items are ready";
  if (order.status === "served") return order.paymentStatusLabel.toLowerCase().includes("paid") ? "Served, ready to complete" : "Served, bill pending";
  return order.kitchenStatus;
}

function kotCountLabel(order: ActiveOpsOrder) {
  if (!order.kitchenOrder) return "KOT pending";
  const incremental = (order.kitchenOrder.statusHistory ?? []).filter((entry) => String(entry.event ?? "").includes("incremental_kot")).length;
  const count = Math.max(1, order.kitchenOrder.printedCount ?? 0, incremental + 1);
  return `${count} KOT${count === 1 ? "" : "s"}`;
}

function ownerAccordionAccent(order: ActiveOpsOrder) {
  if (order.delay?.priority === "critical" || order.delay?.priority === "high") return "red";
  if (order.delay?.delayed) return "amber";
  if (order.status === "ready") return "emerald";
  if (order.status === "served") return "violet";
  if (order.status === "new" || order.status === "occupied") return "orange";
  if (["accepted", "preparing"].includes(order.status)) return "blue";
  return "slate";
}

function priorityLabel(priority?: DelayPriority) {
  if (priority === "critical") return "Critical";
  if (priority === "high") return "High priority";
  if (priority === "medium") return "Delayed";
  return "Normal";
}

function ownerAccordionDelay(order: ActiveOpsOrder): OrderAccordionDelay {
  return {
    delayed: Boolean(order.delay?.delayed),
    level: ownerDelayLevel(order.delay?.priority, order.delay?.lateMinutes),
    label: order.delay?.priority === "critical" ? "Critical delay" : "Delayed",
    lateMinutes: order.delay?.lateMinutes,
    waitingLabel: order.delay?.elapsedLabel ?? order.age,
  };
}

function ownerDelayLevel(priority?: DelayPriority, lateMinutes = 0): OrderDelayLevel {
  if (!priority || priority === "normal") return "none";
  if (priority === "critical" || lateMinutes >= 30) return "critical";
  if (priority === "high" || lateMinutes >= 15) return "red";
  if (priority === "medium" || lateMinutes >= 5) return "orange";
  return "yellow";
}

function ownerStatusTone(status: string): OrderBadgeTone {
  if (status === "ready" || status === "served" || status === "delivered") return "success";
  if (status === "new" || status === "occupied") return "warning";
  if (status === "cancelled" || status === "rejected") return "danger";
  if (status === "completed") return "muted";
  return "info";
}

function ownerPriorityTone(priority?: DelayPriority): OrderBadgeTone {
  if (priority === "critical" || priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "muted";
}

function priorityTone(priority?: DelayPriority) {
  if (priority === "critical") return "bg-red-100 text-red-800";
  if (priority === "high") return "bg-orange-100 text-orange-800";
  if (priority === "medium") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function summaryCardTone(tone: "blue" | "orange" | "green" | "purple" | "amber" | "red") {
  if (tone === "blue") return { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-600" };
  if (tone === "orange") return { border: "border-orange-200", bg: "bg-orange-50", text: "text-orange-600" };
  if (tone === "green") return { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-600" };
  if (tone === "purple") return { border: "border-violet-200", bg: "bg-violet-50", text: "text-violet-600" };
  if (tone === "amber") return { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-600" };
  return { border: "border-red-200", bg: "bg-red-50", text: "text-red-600" };
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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, value]);

  return debounced;
}
