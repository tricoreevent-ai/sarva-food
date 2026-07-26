"use client";

import * as Popover from "@radix-ui/react-popover";
import { ArrowRightLeft, BellRing, CheckCircle2, ChefHat, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Eye, GitMerge, Grid2X2, History, MessageCircle, MoreHorizontal, PlusCircle, Printer, ReceiptText, Scissors, Search, UserRound, UsersRound, Utensils, XCircle, type LucideIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { showLazySarvaNotification, toast } from "@/lib/client-toast";
import { Button } from "@/components/ui/button";
import { OperationalOrderStatusBadge } from "@/components/orders/OperationalOrderStatusBadge";
import type { DemoOrder, PosTable, StaffMember, TableOrder } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { actualOrderTime, readableTableOrderId } from "@/lib/order-display";
import { formatDelayTime, formatOperationalDuration, getKitchenDelay } from "@/lib/kitchen-delay";
import type { OperationalSettings } from "@/lib/order-delay-settings";
import { playOperationalSound } from "@/lib/operational-sounds";
import type { OrderAccordionDelay, OrderBadgeTone, OrderDelayLevel } from "@/components/orders/OrderAccordion.types";
import type { ExtendedDemoOrder, OperationalOrder, TimelineEntry } from "@/lib/active-orders-model";

export { buildOperationalOrders, orderToOperationalOrder } from "@/lib/active-orders-model";
export type { ExtendedDemoOrder, OperationalOrder } from "@/lib/active-orders-model";

const completedHistoryHoldMinutes = 30;

export function orderPaidAmount(canonical: ExtendedDemoOrder | undefined, order: OperationalOrder) {
  const paid = canonical?.paidAmount ?? order.paidAmount;
  if (Number.isFinite(paid)) return Number(paid);
  return order.paymentStatus === "paid" ? Number(order.total ?? canonical?.totals.total ?? 0) : 0;
}

export function orderBalanceDue(canonical: ExtendedDemoOrder | undefined, order: OperationalOrder) {
  return Math.max(0, moneyRound(Number(order.total ?? canonical?.totals.total ?? 0) - orderPaidAmount(canonical, order)));
}

export function timelineEntries(canonical: ExtendedDemoOrder | undefined, order: OperationalOrder) {
  return dedupeTimeline([
    ...safeTimeline(canonical?.auditTimeline),
    ...safeTimeline(canonical?.statusHistory),
    ...safeTimeline(canonical?.paymentTimeline),
    ...safeTimeline(order.auditTimeline),
    ...safeTimeline(order.statusHistory),
    ...safeTimeline(order.paymentTimeline),
  ].sort((first, second) => timelineMillis(second) - timelineMillis(first)));
}

export function safeTimeline(value?: TimelineEntry[]) {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") : [];
}

export function dedupeTimeline(entries: TimelineEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const semantic = String(entry.status ?? entry.foodStatus ?? entry.type ?? entry.event ?? "event").toLowerCase();
    const key = `${semantic}|${timelineMillis(entry)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function timelineLabel(entry: TimelineEntry) {
  const raw = String(entry.type ?? entry.event ?? entry.status ?? "event");
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function timelineCategory(entry: TimelineEntry) {
  const raw = String(entry.type ?? entry.event ?? "").toLowerCase();
  const status = String(entry.status ?? "").toLowerCase();
  if (raw.includes("payment") || entry.paymentStatus) return "Payment";
  if (raw.includes("print") || raw.includes("kot")) return "Print";
  if (status === "served" || status === "completed" || raw.includes("completion")) return "Service";
  if (entry.foodStatus || /(accepted|preparing|ready|cancelled|rejected)/.test(raw)) return "Kitchen";
  if (entry.status) return "Service";
  return "Audit";
}

export function entryTimeValue(entry: TimelineEntry) {
  return entry.timestamp ?? entry.at ?? entry.createdAt ?? entry.time;
}

export function formatTimelineTime(value: unknown) {
  const millis = valueMillis(value);
  return millis ? new Date(millis).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Time not recorded";
}

export function timelineMillis(entry: TimelineEntry) {
  return valueMillis(entryTimeValue(entry)) || 0;
}

export function activeStatusToast(status: TableOrder["status"]) {
  if (status === "cancelled") return "Order cancelled.";
  if (status === "served") return "Order moved to Serving.";
  if (status === "ready") return "Order ready.";
  if (status === "preparing") return "Cooking started.";
  if (status === "accepted") return "Order accepted.";
  return "Order completed.";
}

export function paymentLabel(value?: TableOrder["paymentStatus"]) {
  if (value === "paid") return "Paid";
  if (value === "partial") return "Partially paid";
  if (value === "refunded") return "Refunded";
  return "Unpaid";
}

export function canCollectOrderPayment(order: Pick<OperationalOrder, "status" | "paymentStatus" | "paymentLock" | "mergedIntoOrderId">) {
  const status = String(order.status);
  const paymentStatus = String(order.paymentStatus ?? "pending");
  return !order.mergedIntoOrderId && !["completed", "cancelled", "rejected", "billed"].includes(status) && !["paid", "refunded"].includes(paymentStatus) && !order.paymentLock?.locked;
}

export function smartBillMergeCandidates(target: OperationalOrder, orders: OperationalOrder[]) {
  const table = normalizeTableName(target.tableNumber);
  if (!table || table === "direct") return [];
  return orders.filter((order) => (order.id !== target.id && normalizeTableName(order.tableNumber) === table && canMergeOrderBill(order)));
}

export function canMergeOrderBill(order: Pick<OperationalOrder, "status" | "paymentStatus" | "paymentLock" | "mergedIntoOrderId">) {
  const status = String(order.status);
  const paymentStatus = String(order.paymentStatus ?? "pending");
  return !order.mergedIntoOrderId && !order.paymentLock?.locked && !["completed", "cancelled", "rejected", "billed"].includes(status) && !["authorized", "paid", "refunded"].includes(paymentStatus);
}

export function paymentUnavailableReason(order: Pick<OperationalOrder, "status" | "paymentStatus" | "paymentLock" | "mergedIntoOrderId">) {
  if (order.mergedIntoOrderId) return "Payment is collected from the merged bill.";
  if (order.paymentLock?.locked) return "Order currently being modified. Refresh and retry.";
  if (order.paymentStatus === "paid") return "Payment has already been collected.";
  if (order.paymentStatus === "refunded") return "Refunded orders cannot be paid again.";
  if (["completed", "cancelled", "rejected", "billed"].includes(String(order.status))) return "Cannot collect payment for this order state.";
  return "Payment could not be recorded. Keep the bill open and retry.";
}

function valueMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().getTime();
  if (typeof value === "object" && "seconds" in value) return Number((value as { seconds?: number }).seconds ?? 0) * 1000;
  return 0;
}

function isActiveOrRecentlyCompleted(order: OperationalOrder, nowMs: number) {
  if (["cancelled", "billed"].includes(order.status)) return false;
  if (order.status !== "completed") return true;
  return completedHoldMinutesRemaining(order, nowMs) > 0;
}

function completedHoldMinutesRemaining(order: OperationalOrder, nowMs = Date.now()) {
  const completedAt = latestStatusAt(order, "completed") ?? Date.parse(order.createdAt);
  if (!Number.isFinite(completedAt)) return completedHistoryHoldMinutes;
  return Math.max(0, completedHistoryHoldMinutes - Math.floor((nowMs - completedAt) / 60000));
}

function latestStatusAt(order: OperationalOrder, status: string) {
  return safeTimeline(order.statusHistory)
    .filter((entry) => String(entry.status ?? entry.event ?? entry.type ?? "").toLowerCase().includes(status))
    .map((entry) => valueMillis(entry.at ?? entry.timestamp ?? entry.createdAt))
    .filter(Number.isFinite)
    .sort((first, second) => second - first)[0];
}

function moneyRound(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : 0;
}

function normalizeTableName(value?: string) {
  return String(value ?? "").trim().toUpperCase();
}

function isToday(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function readableOrderType(type?: TableOrder["orderType"]) {
  if (type === "dine-in") return "Dine-in";
  if (type === "takeaway") return "Quick Bill";
  return String(type ?? "Order").charAt(0).toUpperCase() + String(type ?? "order").slice(1);
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, value]);
  return debounced;
}

export type ActiveOrderView = "all" | "operations" | "waiter" | "cashier" | "manager";
type ActiveOrderActionId = "accept" | "prepare" | "ready" | "serve" | "notify" | "payment" | "print" | "preview" | "receipt" | "kot" | "add" | "split" | "transfer" | "reassign" | "merge" | "reminder" | "recall" | "complete" | "archive" | "cancel" | "timeline" | "history";
type ActiveOrderMenuAction = { id: ActiveOrderActionId; label: string; icon: ReactNode; disabled?: boolean; danger?: boolean; reason?: string };

export function ActiveOrdersPanel({
  orders,
  kitchenOrders,
  tables,
  staff,
  loading,
  error,
  orderDelayThresholdMinutes,
  readySound,
  onRetry,
  onOpenNew,
  onOpen,
  onAddItems,
  onPrintBill,
  onPrintReceipt,
  onPrintKot,
  onCollectPayment,
  onNotifyWaiter,
  onSplit,
  onTransfer,
  onAssignWaiter,
  onMerge,
  onTimeline,
  onPaymentHistory,
  onAdvanceKitchen,
  onReminder,
  onRecall,
  onServe,
  onComplete,
  onCancel,
  activeAction,
  waiterView = false,
}: {
  orders: DemoOrder[];
  kitchenOrders: OperationalOrder[];
  tables: PosTable[];
  staff: StaffMember[];
  loading: boolean;
  error: string;
  orderDelayThresholdMinutes: number;
  readySound: OperationalSettings["notificationSounds"]["readyForPickup"];
  onRetry: () => void;
  onOpenNew: () => void;
  onOpen: (order: TableOrder) => void;
  onAddItems: (order: TableOrder) => void;
  onPrintBill: (order: TableOrder) => void;
  onPrintReceipt: (order: TableOrder) => void;
  onPrintKot: (order: TableOrder) => void;
  onCollectPayment: (order: TableOrder) => void;
  onNotifyWaiter: (order: TableOrder) => void;
  onSplit: (order: OperationalOrder) => void;
  onTransfer: (order: OperationalOrder) => void;
  onAssignWaiter: (order: OperationalOrder) => void;
  onMerge: (order: OperationalOrder) => void;
  onTimeline: (order: OperationalOrder) => void;
  onPaymentHistory: (order: OperationalOrder) => void;
  onAdvanceKitchen: (order: OperationalOrder, status: TableOrder["status"]) => void;
  onReminder: (order: TableOrder) => void;
  onRecall: (order: TableOrder) => void;
  onServe: (order: TableOrder) => void;
  onComplete: (order: TableOrder) => void;
  onCancel: (order: TableOrder) => void;
  activeAction?: string | null;
  waiterView?: boolean;
}) {
  const [view, setView] = useState<ActiveOrderView>(() => waiterView ? "waiter" : "all");
  const [search, setSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(() => new Set());
  const [archivedOrderIds, setArchivedOrderIds] = useState<Set<string>>(() => new Set());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const readyAlertedIds = useRef(new Set<string>());
  const debouncedSearch = useDebouncedValue(search, 120);
  const handlersRef = useRef({
    onOpen,
    onAddItems,
    onPrintBill,
    onPrintReceipt,
    onPrintKot,
    onCollectPayment,
    onNotifyWaiter,
    onSplit,
    onTransfer,
    onAssignWaiter,
    onMerge,
    onTimeline,
    onPaymentHistory,
    onAdvanceKitchen,
    onReminder,
    onRecall,
    onServe,
    onComplete,
    onCancel,
  });
  useEffect(() => {
    handlersRef.current = {
      onOpen,
      onAddItems,
      onPrintBill,
      onPrintReceipt,
      onPrintKot,
      onCollectPayment,
      onNotifyWaiter,
      onSplit,
      onTransfer,
      onAssignWaiter,
      onMerge,
      onTimeline,
      onPaymentHistory,
      onAdvanceKitchen,
      onReminder,
      onRecall,
      onServe,
      onComplete,
      onCancel,
    };
  }, [onAddItems, onAdvanceKitchen, onAssignWaiter, onCancel, onCollectPayment, onComplete, onMerge, onNotifyWaiter, onOpen, onPaymentHistory, onPrintBill, onPrintKot, onPrintReceipt, onRecall, onReminder, onServe, onSplit, onTimeline, onTransfer]);

  const allActiveKitchenOrders = useMemo(() => {
    return kitchenOrders
      .filter((order) => !archivedOrderIds.has(order.id))
      .filter((order) => isActiveOrRecentlyCompleted(order, now))
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
      .slice(0, 30);
  }, [archivedOrderIds, kitchenOrders, now]);
  const activeKitchenOrders = useMemo(() => {
    const value = debouncedSearch.trim().toLowerCase();
    return value ? allActiveKitchenOrders.filter((order) => activeOrderSearchText(order).includes(value)) : allActiveKitchenOrders;
  }, [allActiveKitchenOrders, debouncedSearch]);
  const delaysById = useMemo(
    () => new Map(allActiveKitchenOrders.map((order) => [order.id, getKitchenDelay(order, now, { orderDelayThresholdMinutes })])),
    [allActiveKitchenOrders, now, orderDelayThresholdMinutes],
  );
  const groups = useMemo(() => {
    const operationsOrders: OperationalOrder[] = [];
    const waiterOrders: OperationalOrder[] = [];
    const cashierOrders: OperationalOrder[] = [];
    const managerOrders: OperationalOrder[] = [];
    let inKitchen = 0;
    let ready = 0;
    let served = 0;
    let pendingBills = 0;
    let critical = 0;
    let requests = 0;
    for (const order of activeKitchenOrders) {
      const delay = delaysById.get(order.id);
      const operations = ["new", "occupied", "accepted", "preparing"].includes(order.status);
      const waiter = Boolean(order.waiterId || order.waiterName || order.source === "Waiter" || order.hasKitchenTicket !== false || ["ready", "served"].includes(order.status));
      const paymentOpen = canCollectOrderPayment(order);
      const cashier = paymentOpen || order.paymentStatus === "paid";
      const delayed = Boolean(delay && delay.lateMinutes > 2);
      if (operations) operationsOrders.push(order);
      if (waiter) waiterOrders.push(order);
      if (cashier) cashierOrders.push(order);
      if (delayed) managerOrders.push(order);
      if (["accepted", "preparing"].includes(order.status)) inKitchen += 1;
      if (order.status === "ready") ready += 1;
      if (order.status === "served") served += 1;
      if (paymentOpen) pendingBills += 1;
      if (delay && (posDelayLevel(delay) === "critical" || delay.lateMinutes >= 10)) critical += 1;
      if (order.priority === "rush") requests += 1;
    }
    return { operationsOrders, waiterOrders, cashierOrders, managerOrders, inKitchen, ready, served, pendingBills, critical, requests };
  }, [activeKitchenOrders, delaysById]);
  const displayedOrders = view === "operations"
    ? groups.operationsOrders
    : view === "waiter"
      ? groups.waiterOrders
      : view === "cashier"
        ? groups.cashierOrders
        : view === "manager"
          ? groups.managerOrders
          : activeKitchenOrders;
  const waiterStageOrders = useMemo(
    () => activeOrderKanbanStages.map((stage) => ({ ...stage, orders: displayedOrders.filter((order) => stage.statuses.includes(order.status)) })),
    [displayedOrders],
  );
  const completedToday = useMemo(() => orders.filter((order) => ["delivered", "completed"].includes(order.status) && isToday(order.createdAt)).length, [orders]);
  const occupiedTableCount = useMemo(() => (
    tables.length
      ? tables.filter((table) => ["occupied", "reserved"].includes(String(table.status))).length
      : new Set(activeKitchenOrders.map((order) => order.tableNumber).filter(Boolean)).size
  ), [activeKitchenOrders, tables]);
  const activeStaffCount = useMemo(() => (
    staff.length
      ? staff.filter((member) => member.status === "active").length
      : new Set(activeKitchenOrders.map((order) => order.waiterName || order.assignedStaffName).filter(Boolean)).size
  ), [activeKitchenOrders, staff]);
  const views = [
    ["all", "All", ClipboardList],
    ["operations", "Operations", Grid2X2],
    ["waiter", "Waiter", Utensils],
    ["cashier", "Cashier", ReceiptText],
    ["manager", "Manager", UsersRound],
  ] as const;
  const viewCounts = {
    all: activeKitchenOrders.length,
    operations: groups.operationsOrders.length,
    waiter: groups.waiterOrders.length,
    cashier: groups.cashierOrders.length,
    manager: groups.managerOrders.length,
  };

  useEffect(() => {
    if (!waiterView && view !== "waiter") return;
    const readyOrders = groups.waiterOrders.filter((order) => order.status === "ready");
    const readyIds = new Set(readyOrders.map((order) => order.id));
    for (const id of Array.from(readyAlertedIds.current)) {
      if (!readyIds.has(id)) readyAlertedIds.current.delete(id);
    }
    const fresh = readyOrders.find((order) => !readyAlertedIds.current.has(order.id));
    if (!fresh) return;
    readyAlertedIds.current.add(fresh.id);
    showLazySarvaNotification({
      id: `waiter-view-ready-${fresh.id}`,
      tone: "success",
      title: "Ready to Serve",
      message: `${readableTableOrderId(fresh)} · ${fresh.tableNumber || readableOrderType(fresh.orderType)}`,
      meta: "Live Waiter view",
      duration: 8000,
    });
    if (!readySound.muted) {
      void playOperationalSound({ sound: readySound.sound, volume: readySound.volume / 100, repeatCount: readySound.repeatCount });
    }
  }, [groups.waiterOrders, readySound, view, waiterView]);

  const markSeen = useCallback((orderId: string) => {
    setSeenOrderIds((current) => {
      if (current.has(orderId)) return current;
      const next = new Set(current);
      next.add(orderId);
      return next;
    });
  }, []);

  const toggleOrder = useCallback((orderId: string) => {
    markSeen(orderId);
    setExpandedOrderId((current) => current === orderId ? null : orderId);
  }, [markSeen]);

  const runOrderAction = useCallback((action: ActiveOrderActionId, order: OperationalOrder) => {
    const handlers = handlersRef.current;
    if (action === "accept") handlers.onAdvanceKitchen(order, "accepted");
    else if (action === "prepare") handlers.onAdvanceKitchen(order, "preparing");
    else if (action === "ready") handlers.onAdvanceKitchen(order, "ready");
    else if (action === "serve") {
      markSeen(order.id);
      handlers.onServe(order);
    } else if (action === "notify") {
      markSeen(order.id);
      handlers.onNotifyWaiter(order);
    } else if (action === "payment") handlers.onCollectPayment(order);
    else if (action === "print") {
      if (["ready", "served"].includes(order.status) || order.paymentStatus === "paid") handlers.onPrintBill(order);
      else handlers.onPrintKot(order);
    } else if (action === "preview") {
      markSeen(order.id);
      setExpandedOrderId(order.id);
      handlers.onOpen(order);
    } else if (action === "receipt") handlers.onPrintReceipt(order);
    else if (action === "kot") handlers.onPrintKot(order);
    else if (action === "add") handlers.onAddItems(order);
    else if (action === "split") handlers.onSplit(order);
    else if (action === "transfer") handlers.onTransfer(order);
    else if (action === "reassign") handlers.onAssignWaiter(order);
    else if (action === "merge") handlers.onMerge(order);
    else if (action === "reminder") handlers.onReminder(order);
    else if (action === "recall") handlers.onRecall(order);
    else if (action === "complete") handlers.onComplete(order);
    else if (action === "archive") {
      markSeen(order.id);
      setArchivedOrderIds((current) => {
        const next = new Set(current);
        next.add(order.id);
        return next;
      });
      toast.success("Moved to History.");
    }
    else if (action === "cancel") handlers.onCancel(order);
    else if (action === "timeline") {
      markSeen(order.id);
      setExpandedOrderId(order.id);
      handlers.onTimeline(order);
    }
    else {
      markSeen(order.id);
      setExpandedOrderId(order.id);
      handlers.onPaymentHistory(order);
    }
  }, [markSeen]);

  useEffect(() => {
    if (!waiterView) return;
    const id = window.setTimeout(() => setView("waiter"), 0);
    return () => window.clearTimeout(id);
  }, [waiterView]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="flex h-[calc(100dvh-6rem)] min-h-[32rem] min-w-0 flex-col gap-1 overflow-hidden xl:col-span-2" aria-label="Active Orders operational workspace">
      <div className="flex h-11 shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-slate-950">Active Orders</h1>
        </div>
        <Button className="h-11 shrink-0 bg-orange-600 text-white hover:bg-orange-700" onClick={onOpenNew}><PlusCircle className="size-4" />New Order</Button>
      </div>

      <div className="grid shrink-0 gap-2 lg:grid-cols-[auto_minmax(18rem,1fr)]">
        <div className="customer-scroll flex h-11 max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {views.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cn("flex min-h-11 shrink-0 items-center gap-2 border-r border-slate-100 px-3 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 last:border-r-0 motion-reduce:transition-none", view === key ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50")}
              aria-label={`${label} ${viewCounts[key]} orders`}
              aria-pressed={view === key}
            >
              <Icon className="size-4" />
              <span>{label}</span>
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", view === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>{viewCounts[key]}</span>
            </button>
          ))}
        </div>
        <label className="relative block h-11">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-20 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order, table, customer, item, waiter..."
            aria-label="Search active orders"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">{displayedOrders.length}/{activeKitchenOrders.length}</span>
        </label>
      </div>

      <ActiveOrderSummaryBoard
        withWaiter={groups.waiterOrders.length}
        inKitchen={groups.inKitchen}
        ready={groups.ready}
        served={groups.served}
        pendingBills={groups.pendingBills}
        critical={groups.critical}
        requests={groups.requests}
        tableTrend={`${occupiedTableCount} tables`}
        servedTrend={`${completedToday} done`}
        requestTrend={`${activeStaffCount} staff`}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" tabIndex={0} aria-label="Scrollable active order cards">
        {error ? (
          <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800" role="alert">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" className="min-h-11 border-red-300 bg-white text-red-700" onClick={onRetry}>Retry</Button>
          </div>
        ) : null}
        {view === "waiter" && displayedOrders.length ? (
          <div className="grid min-w-0 items-start gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {waiterStageOrders.map((stage) => (
              <section key={stage.id} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-2" aria-label={`${stage.label} waiter orders`}>
                <header className="mb-2 flex h-8 items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-black uppercase text-slate-700">{stage.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">{stage.orders.length}</span>
                </header>
                <div className="grid gap-1.5">
                  {stage.orders.length ? stage.orders.map((order) => (
                    <MemoActiveOrderCard
                      key={order.id}
                      order={order}
                      delay={delaysById.get(order.id) ?? getKitchenDelay(order, now, { orderDelayThresholdMinutes })}
                      view={view}
                      canMerge={allActiveKitchenOrders.length >= 2}
                      busy={Boolean(activeAction?.endsWith(`:${order.id}`))}
                      expanded={expandedOrderId === order.id}
                      unread={!seenOrderIds.has(order.id) && (order.status === "ready" || order.priority === "rush")}
                      onToggle={toggleOrder}
                      onAction={runOrderAction}
                    />
                  )) : <p className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-center text-xs font-bold text-slate-400">No {stage.label.toLowerCase()} orders</p>}
                </div>
              </section>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 items-start gap-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-6">
          {loading && !displayedOrders.length ? (
            <ActiveOrdersSkeleton />
          ) : displayedOrders.length ? displayedOrders.map((order) => (
            <MemoActiveOrderCard
              key={order.id}
              order={order}
              delay={delaysById.get(order.id) ?? getKitchenDelay(order, now, { orderDelayThresholdMinutes })}
              view={view}
              canMerge={allActiveKitchenOrders.length >= 2}
              busy={Boolean(activeAction?.endsWith(`:${order.id}`))}
              expanded={expandedOrderId === order.id}
              unread={!seenOrderIds.has(order.id) && (order.status === "ready" || order.priority === "rush")}
              onToggle={toggleOrder}
              onAction={runOrderAction}
            />
          )) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 lg:col-span-4 2xl:col-span-5 min-[1920px]:col-span-6">
              {view === "waiter" ? "No orders assigned for waiter service." : view === "manager" ? "No delayed orders need manager attention." : "No active orders right now."}
            </div>
          )}
        </div>
        )}
      </div>

      <div className="shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-xs font-black text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600" onClick={() => setSummaryOpen((current) => !current)} aria-expanded={summaryOpen}>
          <span>Status ribbon</span>
          <span className="flex min-w-0 items-center gap-3 overflow-hidden text-[10px] text-slate-500">
            <span className="truncate">Kitchen {groups.inKitchen}</span>
            <span className="truncate">Ready {groups.ready}</span>
            <span className="truncate">Bills {groups.pendingBills}</span>
            <span className="truncate text-red-600">Critical {groups.critical}</span>
            <ChevronDown className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", summaryOpen && "rotate-180")} />
          </span>
        </button>
        {summaryOpen ? (
          <div className="customer-scroll flex gap-4 overflow-x-auto border-t border-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600">
            {activeOrderLegendItems.map(([label, color]) => <span key={label} className="flex shrink-0 items-center gap-2"><span className={cn("size-2 rounded-full", color)} />{label}</span>)}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ActiveOrderCard({
  order,
  delay,
  view,
  canMerge,
  busy,
  expanded,
  unread,
  onToggle,
  onAction,
}: {
  order: OperationalOrder;
  delay: ReturnType<typeof getKitchenDelay>;
  view: ActiveOrderView;
  canMerge: boolean;
  busy: boolean;
  expanded: boolean;
  unread: boolean;
  onToggle: (orderId: string) => void;
  onAction: (action: ActiveOrderActionId, order: OperationalOrder) => void;
}) {
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const table = order.tableNumber || readableOrderType(order.orderType);
  const customer = order.customerName || order.guestName || "Walk-in";
  const waiter = order.waiterName || order.assignedStaffName || "Unassigned";
  const total = Number(order.total ?? order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
  const paid = order.paymentStatus === "paid";
  const ready = order.status === "ready";
  const served = order.status === "served";
  const completed = ["completed", "billed"].includes(order.status);
  const completedHold = completed ? completedHoldMinutesRemaining(order) : 0;
  const paymentLocked = Boolean(order.paymentLock?.locked);
  const paymentRestricted = paymentLocked || ["authorized", "partial", "paid", "refunded"].includes(String(order.paymentStatus ?? "pending"));
  const canMergeBill = canMergeOrderBill(order);
  const active = !["completed", "cancelled", "billed"].includes(order.status);
  const canModify = active && !paymentRestricted;
  const canCollect = canCollectOrderPayment(order);
  const canSplit = active && !paid && order.paymentStatus !== "refunded" && !paymentLocked;
  const canComplete = served && paid;
  const canCancel = active && !paymentRestricted;
  const canContactKitchen = active && !served && order.hasKitchenTicket !== false;
  const canNotify = ready && order.hasKitchenTicket !== false;
  const canSendToKitchen = active && ["new", "occupied"].includes(order.status);
  const canStartPreparing = active && order.status === "accepted";
  const canMarkReady = active && order.status === "preparing";
  const kitchenActionAllowed = view !== "waiter" || canSendToKitchen;
  const kitchenAction = canSendToKitchen
    ? { id: "accept" as const, label: order.hasKitchenTicket === false ? "Send To Kitchen" : "Accept Order", icon: <ChefHat className="size-4" />, title: order.hasKitchenTicket === false ? "Create Kitchen ticket and accept order" : "Accept Kitchen ticket" }
    : canStartPreparing
      ? { id: "prepare" as const, label: "Start Preparing", icon: <ChefHat className="size-4" />, title: "Move order to Preparing" }
      : canMarkReady
        ? { id: "ready" as const, label: "Mark Ready", icon: <CheckCircle2 className="size-4" />, title: "Mark order Ready for service" }
        : null;
  const canCollectForView = canCollect;
  const canNotifyForView = view !== "waiter" && canNotify;
  const pendingPaymentMessage = "Payment is still pending. Please collect payment before completing this order.";
  const orderNumber = readableTableOrderId(order);
  const kitchenStatus = posActiveStatusLabel(order);
  const paymentStatus = paymentLabel(order.paymentStatus);
  const preparationProgress = posPreparationProgress(order.status);
  const eta = delay.lateMinutes > 2 ? `+${formatDelayTime(delay.lateMinutes).label}` : `${order.etaMinutes ?? 12}m`;
  const waiting = formatOperationalDuration(delay.elapsedMinutes);
  const priority = posPriorityLabel(order, delay);
  const expandedId = `pos-active-${order.id}-details`;
  const timeline = expanded ? timelineEntries(undefined, order).slice(0, 6) : [];
  const history = expanded ? dedupeTimeline([...safeTimeline(order.auditTimeline), ...safeTimeline(order.paymentTimeline)].sort((first, second) => timelineMillis(second) - timelineMillis(first))).slice(0, 6) : [];
  const kitchenNotes = expanded
    ? order.lines.flatMap((line) => [line.notes, line.allergyNote ? `Allergy: ${line.allergyNote}` : undefined]).filter((note): note is string => Boolean(note))
    : [];
  const facts = expanded ? [
    ["Customer", customer],
    ["Phone", order.customerPhone || "Not provided"],
    ["Table", table],
    ["Waiter", waiter],
    ["Items", `${itemCount}`],
    ["Kitchen", `${kitchenStatus} · ${preparationProgress}%`],
    ["Payment", `${paymentStatus} · ${formatCurrency(total)}`],
    ["Ready for Pickup", ready ? "Yes" : "No"],
    ["Serving", served ? "Yes" : "No"],
    ["Completed", completed ? "Yes" : "No"],
    ...(completed ? [["Auto History", `${completedHold}m`]] : []),
  ] : [];
  const menuActions: ActiveOrderMenuAction[] = view === "waiter"
    ? [
        ...(kitchenAction ? [{ id: kitchenAction.id, label: kitchenAction.label, icon: kitchenAction.icon, disabled: busy || !kitchenActionAllowed, reason: kitchenActionAllowed ? undefined : "Kitchen state changes are handled by Kitchen Operations." }] : []),
        { id: "kot", label: "Print KOT", icon: <ClipboardList className="size-4" /> },
        { id: "add", label: "Add Items", icon: <PlusCircle className="size-4" />, disabled: !canModify, reason: paymentRestricted ? "Cannot add items after payment has started." : undefined },
        { id: "split", label: "Split Bill", icon: <Scissors className="size-4" />, disabled: !canSplit || busy, reason: paid ? "Payment has already been collected." : order.paymentStatus === "refunded" ? "Refunded orders cannot be paid again." : undefined },
        { id: "merge", label: "Merge Bills", icon: <GitMerge className="size-4" />, disabled: !canMerge || !canMergeBill || busy, reason: !canMerge ? "No other active order is available to merge." : !canMergeBill ? "Cannot merge authorized, paid, refunded, locked, completed, or already merged bills." : undefined },
        { id: "transfer", label: "Transfer Table", icon: <ArrowRightLeft className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot transfer after payment has started." : undefined },
        { id: "reassign", label: "Assign Waiter", icon: <UserRound className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot assign waiter after payment has started." : undefined },
        { id: "complete", label: "Complete Order", icon: <CheckCircle2 className="size-4" />, disabled: !canComplete || busy, reason: !served ? "Cannot complete before service." : !paid ? pendingPaymentMessage : undefined },
        { id: "archive", label: "Move To History", icon: <History className="size-4" />, disabled: !completed },
        { id: "timeline", label: "Timeline", icon: <Clock3 className="size-4" /> },
        { id: "history", label: "History", icon: <History className="size-4" /> },
      ]
    : view === "cashier"
      ? [
          { id: "receipt", label: "Print Receipt", icon: <Printer className="size-4" />, disabled: !paid },
          { id: "history", label: "Payment History", icon: <History className="size-4" /> },
        ]
      : view === "manager"
        ? [
            { id: "add", label: "Add Items", icon: <PlusCircle className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot add items after payment has started." : undefined },
            { id: "transfer", label: "Transfer Table", icon: <ArrowRightLeft className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot transfer after payment has started." : undefined },
            { id: "reassign", label: "Assign Waiter", icon: <UserRound className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot assign waiter after payment has started." : undefined },
            { id: "merge", label: "Merge Bills", icon: <GitMerge className="size-4" />, disabled: !canMerge || !canMergeBill || busy, reason: !canMerge ? "No other active order is available to merge." : !canMergeBill ? "Cannot merge authorized, paid, refunded, locked, completed, or already merged bills." : undefined },
            { id: "split", label: "Split Bill", icon: <Scissors className="size-4" />, disabled: !canSplit || busy, reason: paid ? "Payment has already been collected." : order.paymentStatus === "refunded" ? "Refunded orders cannot be paid again." : undefined },
            { id: "timeline", label: "Timeline", icon: <Clock3 className="size-4" /> },
            { id: "history", label: "History", icon: <History className="size-4" /> },
            { id: "cancel", label: "Cancel Order", icon: <XCircle className="size-4" />, disabled: !canCancel || busy, reason: paymentRestricted ? "Paid or payment-started orders require a refund workflow." : undefined, danger: true },
          ]
        : [
            ...(kitchenAction ? [{ id: kitchenAction.id, label: kitchenAction.label, icon: kitchenAction.icon, disabled: busy || !kitchenActionAllowed, reason: kitchenActionAllowed ? undefined : "Kitchen state changes are handled by Kitchen Operations." }] : []),
            { id: "receipt", label: "Print Receipt", icon: <Printer className="size-4" />, disabled: !paid },
            { id: "kot", label: "Print KOT", icon: <ClipboardList className="size-4" /> },
            { id: "add", label: "Add Items", icon: <PlusCircle className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot add items after payment has started." : undefined },
            { id: "split", label: "Split Bill", icon: <Scissors className="size-4" />, disabled: !canSplit || busy, reason: paid ? "Payment has already been collected." : order.paymentStatus === "refunded" ? "Refunded orders cannot be paid again." : undefined },
            { id: "transfer", label: "Transfer Table", icon: <ArrowRightLeft className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot transfer after payment has started." : undefined },
            { id: "reassign", label: "Assign Waiter", icon: <UserRound className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot assign waiter after payment has started." : undefined },
            { id: "merge", label: "Merge Bills", icon: <GitMerge className="size-4" />, disabled: !canMerge || !canMergeBill || busy, reason: !canMerge ? "No other active order is available to merge." : !canMergeBill ? "Cannot merge authorized, paid, refunded, locked, completed, or already merged bills." : undefined },
            { id: "reminder", label: "Reminder", icon: <BellRing className="size-4" />, disabled: !canContactKitchen || busy, reason: served ? "Order has already been served." : order.hasKitchenTicket === false ? "Kitchen ticket is unavailable." : undefined },
            { id: "recall", label: "Kitchen Recall", icon: <BellRing className="size-4" />, disabled: !canContactKitchen || busy, reason: served ? "Order has already been served." : order.hasKitchenTicket === false ? "Kitchen ticket is unavailable." : undefined },
            { id: "complete", label: "Complete Order", icon: <CheckCircle2 className="size-4" />, disabled: !served || !paid || busy, reason: !served ? "Cannot complete before service." : !paid ? "Cannot complete while payment is pending." : undefined },
            { id: "timeline", label: "Timeline", icon: <Clock3 className="size-4" /> },
            { id: "history", label: "History", icon: <History className="size-4" /> },
            { id: "cancel", label: "Cancel Order", icon: <XCircle className="size-4" />, disabled: !canCancel || busy, reason: paymentRestricted ? "Paid or payment-started orders require a refund workflow." : undefined, danger: true },
          ];

  const handleToggle = useCallback(() => onToggle(order.id), [onToggle, order.id]);
  const handleAction = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    onAction(event.currentTarget.dataset.action as ActiveOrderActionId, order);
  }, [onAction, order]);

  return (
    <article
      className={cn(
        "relative min-w-0 rounded-lg border bg-white shadow-sm",
        posActiveAccentBorder(order),
        delay.lateMinutes > 2 && "border-amber-300",
        ready && "border-emerald-300 bg-emerald-50/35",
        expanded && "md:col-span-2",
      )}
      aria-labelledby={`pos-active-${order.id}-title`}
    >
      <div className="relative grid min-h-[5.75rem] content-center gap-1 px-2 py-1.5 pr-12">
        <div className="flex min-w-0 items-center gap-1.5">
          {unread ? <span className="size-2 shrink-0 rounded-full bg-red-500" title="Unread operational notification"><span className="sr-only">Unread operational notification</span></span> : null}
          <h2 id={`pos-active-${order.id}-title`} className="shrink-0 truncate text-[11px] font-black text-slate-950">{orderNumber}</h2>
          <OperationalOrderStatusBadge status={order.status} label={kitchenStatus} compact className="max-w-24 truncate" />
          <span className={cn("shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase", activeOrderPaymentBadgeClass(order.paymentStatus))} title={`Payment ${paymentStatus} · ${formatCurrency(total)}`}>P:{paymentStatus}</span>
        </div>
        <div className="grid grid-cols-6 gap-1 text-[8px] font-black text-slate-500">
          <span className="truncate" title={`${itemCount} items`}>{itemCount}i</span>
          <span className="col-span-2 truncate" title={`${table} · ${customer}`}>{table} · {customer}</span>
          <span className={cn("truncate", delay.lateMinutes > 2 && "text-red-700")} title={`ETA ${eta}`}>{eta}</span>
          <span className="truncate" title={`Waiting ${waiting}`}>{waiting}</span>
          <span className={cn("truncate", priority === "Critical" || priority === "High" ? "text-red-700" : "text-slate-500")} title={`Priority ${priority}`}>{priority}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-slate-100" title={`Preparation Progress ${preparationProgress}%`}>
          <span className={cn("block h-full rounded-full", activeOrderProgressClass(order.status))} style={{ width: `${preparationProgress}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-1 text-[7px] font-black uppercase">
          <span className={activeOrderServiceFlagClass(ready, "pickup")} title="Ready for Pickup">Pickup</span>
          <span className={activeOrderServiceFlagClass(served, "served")} title="Serving">Serving</span>
          <span className={activeOrderServiceFlagClass(completed, "completed")} title="Completed">Done</span>
        </div>
        {completed ? <div className="truncate text-[8px] font-black uppercase text-slate-500">Auto history in {completedHold}m</div> : null}
        <button
          type="button"
          className="absolute right-0 top-0 grid size-11 place-items-center rounded-tr-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={expandedId}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${orderNumber}`}
        >
          <ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", expanded && "rotate-180")} />
        </button>
      </div>

      <div className="grid h-11 grid-cols-6 border-t border-slate-100" aria-label={`${orderNumber} actions`}>
        {completed ? (
          <button type="button" data-action="archive" disabled={busy} onClick={handleAction} className={activeOrderActionClass(true, "default")} aria-label="Move To History" title="Move To History"><History className="size-4" /><span className="sr-only">History</span></button>
        ) : canComplete ? (
          <button type="button" data-action="complete" disabled={busy} onClick={handleAction} className={activeOrderActionClass(true, "success")} aria-label="Complete Order" title="Complete Order"><CheckCircle2 className="size-4" /><span className="sr-only">Complete</span></button>
        ) : served && !paid ? (
          <button type="button" data-action="complete" disabled onClick={handleAction} className={activeOrderActionClass(false, "success")} aria-label="Complete Order" title={pendingPaymentMessage}><CheckCircle2 className="size-4" /><span className="sr-only">Complete</span></button>
        ) : kitchenAction ? (
          <button type="button" data-action={kitchenAction.id} disabled={busy || !kitchenActionAllowed} onClick={handleAction} className={activeOrderActionClass(kitchenActionAllowed, "success")} aria-label={kitchenAction.label} title={kitchenActionAllowed ? kitchenAction.title : "Kitchen state changes are handled by Kitchen Operations."}>{kitchenAction.icon}<span className="sr-only">{kitchenAction.label}</span></button>
        ) : (
          <button type="button" data-action="serve" disabled={!ready || busy} onClick={handleAction} className={activeOrderActionClass(ready, "success")} aria-label="Serve Order" title={ready ? "Serve Order" : "Cannot Serve: kitchen has not marked Ready."}><Utensils className="size-4" /><span className="sr-only">Serve</span></button>
        )}
        <button type="button" data-action="notify" disabled={!canNotifyForView || busy} onClick={handleAction} className={activeOrderActionClass(canNotifyForView, "default")} aria-label="Ready Signal" title={view === "waiter" ? "Kitchen sends ready signals; serve the ticket after pickup." : canNotify ? "Send Ready Signal" : "Cannot signal: order is not Ready or has no kitchen ticket."}><BellRing className="size-4" /><span className="sr-only">Signal</span></button>
        <button type="button" data-action="payment" disabled={!canCollectForView || busy} onClick={handleAction} className={activeOrderActionClass(canCollectForView, "payment")} aria-label="Collect Payment" title={canCollect ? "Collect Payment" : paymentUnavailableReason(order)}><CircleDollarSign className="size-4" /><span className="sr-only">Payment</span></button>
        <button type="button" data-action="print" disabled={busy} onClick={handleAction} className={activeOrderActionClass(true, "default")} aria-label="Print" title={["ready", "served"].includes(order.status) || paid ? "Print Bill" : "Print KOT"}><Printer className="size-4" /><span className="sr-only">Print</span></button>
        <button type="button" data-action="preview" disabled={busy} onClick={handleAction} className={activeOrderActionClass(true, "default")} aria-label="View / Preview" title="View / Preview"><Eye className="size-4" /><span className="sr-only">Preview</span></button>
        <ActiveOrderActionMenu order={order} actions={menuActions} disabled={busy} onAction={onAction} />
      </div>

      {expanded ? (
        <div id={expandedId} className="grid gap-3 border-t border-slate-100 bg-slate-50/60 p-3 text-xs lg:grid-cols-2">
          <dl className="grid content-start gap-1.5">
            {facts.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2">
                <dt className="font-bold text-slate-500">{label}</dt>
                <dd className="min-w-0 break-words font-black text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <section>
            <h3 className="font-black uppercase text-slate-500">Items</h3>
            <div className="mt-1.5 grid gap-1">
              {order.lines.map((line, lineIndex) => (
                <div key={`${line.itemId ?? line.name}-${lineIndex}`} className="flex items-start justify-between gap-2 rounded-md bg-white px-2 py-1.5">
                  <span className="min-w-0 font-black text-slate-800">{line.quantity}× {line.name}</span>
                  <span className="shrink-0 font-bold text-slate-600">{formatCurrency(line.price * line.quantity)}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="font-black uppercase text-slate-500">Kitchen Notes</h3>
            <div className="mt-1.5 rounded-md bg-white p-2 font-semibold text-slate-700">
              {kitchenNotes.length ? kitchenNotes.map((note) => <p key={note}>{note}</p>) : "No kitchen notes"}
            </div>
          </section>
          <section>
            <h3 className="font-black uppercase text-slate-500">Timeline</h3>
            <div className="mt-1.5 grid gap-1">
              {timeline.length ? timeline.map((entry, timelineIndex) => (
                <p key={`${timelineLabel(entry)}-${timelineIndex}`} className="flex justify-between gap-2 rounded-md bg-white px-2 py-1.5 font-semibold text-slate-700">
                  <span>{timelineLabel(entry)}</span>
                  <span className="shrink-0 text-slate-500">{formatTimelineTime(entryTimeValue(entry))}</span>
                </p>
              )) : <p className="rounded-md bg-white p-2 font-semibold text-slate-500">Created {actualOrderTime(order.createdAt)}</p>}
            </div>
          </section>
          <section className="lg:col-span-2">
            <h3 className="font-black uppercase text-slate-500">History</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {history.length ? history.map((entry, historyIndex) => (
                <span key={`${timelineLabel(entry)}-${historyIndex}`} className="rounded-full border border-slate-200 bg-white px-2 py-1 font-bold text-slate-600">{timelineLabel(entry)} · {formatTimelineTime(entryTimeValue(entry))}</span>
              )) : <span className="font-semibold text-slate-500">No additional history</span>}
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}

const MemoActiveOrderCard = memo(ActiveOrderCard);

function ActiveOrdersSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <div key={index} className="h-[5.5rem] animate-pulse rounded-lg border border-slate-200 bg-white p-2" aria-hidden="true">
      <div className="h-4 w-3/4 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-full rounded bg-slate-100" />
      <div className="mt-3 grid grid-cols-6 gap-1">
        {Array.from({ length: 6 }, (__, actionIndex) => <span key={actionIndex} className="h-8 rounded bg-slate-100" />)}
      </div>
    </div>
  ));
}

function ActiveOrderActionMenu({
  order,
  actions,
  disabled,
  onAction,
}: {
  order: OperationalOrder;
  actions: ActiveOrderMenuAction[];
  disabled: boolean;
  onAction: (action: ActiveOrderActionId, order: OperationalOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const runAction = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    setOpen(false);
    onAction(event.currentTarget.dataset.action as ActiveOrderActionId, order);
  }, [onAction, order]);
  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)") ?? []);
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
  }, []);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" disabled={disabled} className={activeOrderActionClass(true, "default")} aria-label="More Actions" title="More Actions">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">More</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content ref={menuRef} align="end" sideOffset={6} collisionPadding={10} className="z-[80] max-h-[min(70vh,28rem)] w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl" role="menu" aria-label="More order actions" onKeyDown={handleMenuKeyDown}>
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              data-action={action.id}
              disabled={action.disabled}
              title={action.disabled ? action.reason ?? `${action.label} is unavailable for the current order state.` : action.label}
              aria-label={action.disabled && action.reason ? `${action.label}. ${action.reason}` : action.label}
              onClick={runAction}
              className={cn("flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-black focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40", action.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50")}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function activeOrderActionClass(enabled: boolean, tone: "default" | "success" | "payment") {
  return cn(
    "grid min-h-11 place-items-center border-r border-slate-100 text-slate-600 transition-colors last:border-r-0 hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 motion-reduce:transition-none",
    enabled && tone === "success" && "text-emerald-700 hover:bg-emerald-50",
    enabled && tone === "payment" && "text-violet-700 hover:bg-violet-50",
  );
}

function activeOrderPaymentBadgeClass(status?: TableOrder["paymentStatus"]) {
  if (status === "paid") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "partial" || status === "authorized") return "border-violet-100 bg-violet-50 text-violet-700";
  if (status === "failed" || status === "refunded") return "border-red-100 bg-red-50 text-red-700";
  return "border-amber-100 bg-amber-50 text-amber-700";
}

function activeOrderServiceFlagClass(active: boolean, tone: "pickup" | "served" | "completed") {
  const activeClass = tone === "pickup"
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : tone === "served"
      ? "border-violet-100 bg-violet-50 text-violet-700"
      : "border-slate-200 bg-slate-100 text-slate-700";
  return cn("truncate rounded-full border px-1 py-0.5 text-center", active ? activeClass : "border-slate-100 bg-slate-50 text-slate-300");
}

function activeOrderProgressClass(status: TableOrder["status"]) {
  if (status === "ready") return "bg-emerald-500";
  if (status === "served") return "bg-violet-500";
  if (status === "completed" || status === "billed") return "bg-slate-500";
  if (status === "preparing") return "bg-orange-500";
  if (status === "accepted") return "bg-blue-500";
  return "bg-slate-300";
}

function posPreparationProgress(status: TableOrder["status"]) {
  if (status === "accepted") return 25;
  if (status === "preparing") return 60;
  if (status === "ready") return 85;
  if (status === "served") return 95;
  if (status === "completed" || status === "billed") return 100;
  return 10;
}

function posActiveAccentBorder(order: TableOrder) {
  if (order.status === "new" || order.status === "occupied") return "border-l-4 border-l-blue-500";
  if (order.status === "accepted") return "border-l-4 border-l-blue-500";
  if (order.status === "preparing") return "border-l-4 border-l-orange-500";
  if (order.status === "ready") return "border-l-4 border-l-emerald-500";
  if (order.status === "served") return "border-l-4 border-l-violet-500";
  return "border-l-4 border-l-slate-300";
}

export function orderStatusTone(status?: string, payment?: string) {
  if (payment === "paid") return { chip: "bg-emerald-900 text-white", bar: "bg-emerald-900", dot: "bg-emerald-900" };
  if (status === "new") return { chip: "bg-blue-50 text-blue-700", bar: "bg-blue-500", dot: "bg-blue-500" };
  if (status === "accepted") return { chip: "bg-blue-50 text-blue-700", bar: "bg-blue-500", dot: "bg-blue-500" };
  if (status === "preparing") return { chip: "bg-orange-50 text-orange-700", bar: "bg-orange-500", dot: "bg-orange-500" };
  if (status === "ready") return { chip: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500", dot: "bg-emerald-500" };
  if (status === "served") return { chip: "bg-violet-50 text-violet-700", bar: "bg-violet-500", dot: "bg-violet-500" };
  if (status === "billing" || status === "billed") return { chip: "bg-purple-50 text-purple-700", bar: "bg-purple-500", dot: "bg-purple-500" };
  if (status === "cancelled" || status === "rejected") return { chip: "bg-red-50 text-red-700", bar: "bg-red-500", dot: "bg-red-500" };
  return { chip: "bg-slate-100 text-slate-700", bar: "bg-slate-400", dot: "bg-slate-400" };
}

export function posOrderStatusLabel(status: TableOrder["status"], payment?: TableOrder["paymentStatus"]) {
  void payment;
  return status.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function posActiveStatusLabel(order: TableOrder) {
  if (order.status === "new" || order.status === "occupied") return order.waiterId || order.waiterName || order.source === "Waiter" ? "With Waiter" : "Order Taken";
  if (order.status === "accepted") return "Accepted";
  if (order.status === "preparing") return "Preparing";
  if (order.status === "ready") return "Ready To Serve";
  if (order.status === "served") return "Serving";
  return posOrderStatusLabel(order.status, order.paymentStatus);
}

export function posStatusTone(status: TableOrder["status"], payment?: TableOrder["paymentStatus"]): OrderBadgeTone {
  void payment;
  if (status === "ready") return "success";
  if (status === "served") return "violet";
  if (status === "new" || status === "occupied") return "warning";
  if (status === "cancelled") return "danger";
  if (status === "completed" || status === "billed") return "muted";
  if (status === "preparing") return "warning";
  return "info";
}

export function posPriorityLabel(order: TableOrder, delay: ReturnType<typeof getKitchenDelay>) {
  if (delay.priority === "critical") return "Critical";
  if (delay.priority === "high" || order.priority === "rush") return "High";
  if (delay.priority === "medium") return "Delayed";
  return "Normal";
}

export function posPriorityTone(order: TableOrder, delay: ReturnType<typeof getKitchenDelay>): OrderBadgeTone {
  if (delay.priority === "critical" || delay.priority === "high" || order.priority === "rush") return "danger";
  if (delay.delayed) return "warning";
  return "muted";
}

export function posAccordionDelay(delay: ReturnType<typeof getKitchenDelay>): OrderAccordionDelay {
  return {
    delayed: delay.lateMinutes > 2,
    level: posDelayLevel(delay),
    label: delay.priority === "critical" ? "Critical delay" : "Delayed",
    lateMinutes: delay.lateMinutes,
    waitingLabel: delay.elapsedLabel,
  };
}

function posDelayLevel(delay: ReturnType<typeof getKitchenDelay>): OrderDelayLevel {
  if (delay.lateMinutes <= 2) return "none";
  if (delay.priority === "critical" && delay.lateMinutes >= 10) return "critical";
  if (delay.lateMinutes >= 10) return "red";
  if (delay.lateMinutes >= 5) return "orange";
  return "yellow";
}

function activeOrderSearchText(order: OperationalOrder) {
  const raw = order as OperationalOrder & {
    deliveryPartnerName?: string;
    vehicleNumber?: string;
    qrTableCode?: string;
  };
  return [
    readableTableOrderId(order),
    order.orderNumber,
    order.displayOrderNumber,
    order.invoiceNumber,
    order.billNumber,
    order.tableNumber,
    order.customerName,
    order.guestName,
    order.customerPhone,
    order.waiterName,
    order.assignedStaffName,
    raw.deliveryPartnerName,
    raw.vehicleNumber,
    raw.qrTableCode,
    order.source,
    order.orderType,
    ...order.lines.map((line) => `${line.name} ${line.itemId}`),
  ].filter(Boolean).join(" ").toLowerCase();
}

const activeOrderLegendItems = [
  ["With Waiter", "bg-blue-500"],
  ["In Kitchen", "bg-orange-500"],
  ["Ready", "bg-emerald-500"],
  ["Serving", "bg-violet-500"],
  ["Pending", "bg-amber-500"],
  ["Delayed", "bg-red-500"],
] as const;

const activeOrderKanbanStages: Array<{ id: string; label: string; statuses: TableOrder["status"][] }> = [
  { id: "new", label: "New", statuses: ["new", "occupied"] },
  { id: "accepted", label: "Accepted", statuses: ["accepted"] },
  { id: "preparing", label: "Preparing", statuses: ["preparing"] },
  { id: "ready", label: "Ready", statuses: ["ready"] },
  { id: "serving", label: "Serving", statuses: ["served"] },
  { id: "completed", label: "Completed", statuses: ["completed", "billed"] },
];

function ActiveOrderSummaryBoard({
  withWaiter,
  inKitchen,
  ready,
  served,
  pendingBills,
  critical,
  requests,
  tableTrend,
  servedTrend,
  requestTrend,
}: {
  withWaiter: number;
  inKitchen: number;
  ready: number;
  served: number;
  pendingBills: number;
  critical: number;
  requests: number;
  tableTrend: string;
  servedTrend: string;
  requestTrend: string;
}) {
  const cards: Array<{ label: string; value: number; trend: string; icon: LucideIcon; tone: "blue" | "orange" | "green" | "violet" | "amber" | "red" | "slate" }> = [
    { label: "With Waiter", value: withWaiter, trend: tableTrend, icon: UserRound, tone: "blue" },
    { label: "In Kitchen", value: inKitchen, trend: "Live queue", icon: ChefHat, tone: "orange" },
    { label: "Ready To Serve", value: ready, trend: "Serve next", icon: Utensils, tone: "green" },
    { label: "Serving", value: served, trend: servedTrend, icon: CheckCircle2, tone: "violet" },
    { label: "Pending Bills", value: pendingBills, trend: "Cashier action", icon: ReceiptText, tone: "amber" },
    { label: "Critical Delay", value: critical, trend: critical ? "Act now" : "On target", icon: BellRing, tone: "red" },
    { label: "Requests", value: requests, trend: requestTrend, icon: MessageCircle, tone: "slate" },
  ];
  return (
    <section className="customer-scroll grid h-14 shrink-0 grid-flow-col auto-cols-[minmax(8rem,1fr)] gap-1 overflow-x-auto" aria-label="Active order summary">
      {cards.map((card) => {
        const tone = activeOrderSummaryTone(card.tone);
        const Icon = card.icon;
        return (
          <article key={card.label} className={cn("grid h-14 min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-1.5 rounded-lg border bg-white px-2 shadow-sm", tone.border)}>
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", tone.bg, tone.text)}><Icon className="size-3.5" /></span>
            <div className="min-w-0">
              <p className="text-lg font-black leading-none text-slate-950">{card.value}</p>
              <p className="mt-0.5 truncate text-[9px] font-black uppercase text-slate-500">{card.label}</p>
              <p className={cn("truncate text-[8px] font-black", tone.text)}>{card.trend}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function activeOrderSummaryTone(tone: "blue" | "orange" | "green" | "violet" | "amber" | "red" | "slate") {
  if (tone === "blue") return { border: "border-blue-100", bg: "bg-blue-50", text: "text-blue-700" };
  if (tone === "orange") return { border: "border-orange-100", bg: "bg-orange-50", text: "text-orange-700" };
  if (tone === "green") return { border: "border-emerald-100", bg: "bg-emerald-50", text: "text-emerald-700" };
  if (tone === "violet") return { border: "border-violet-100", bg: "bg-violet-50", text: "text-violet-700" };
  if (tone === "amber") return { border: "border-amber-100", bg: "bg-amber-50", text: "text-amber-700" };
  if (tone === "red") return { border: "border-red-100", bg: "bg-red-50", text: "text-red-700" };
  return { border: "border-slate-200", bg: "bg-slate-100", text: "text-slate-700" };
}

