"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  ChevronDown,
  CheckCircle2,
  Eye,
  Filter,
  History,
  Maximize2,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  Timer,
  UtensilsCrossed,
  Volume2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePrinterSettings } from "@/hooks/use-printer-settings";
import { delaySortRank, getKitchenDelay, type DelayState } from "@/lib/kitchen-delay";
import { cn } from "@/lib/utils";
import type { PosTable, PrinterProfile, TableOrder, TableOrderStatus } from "@/lib/types";

type KitchenColumnId = "new" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";
type PaymentState = "unpaid" | "partial" | "paid" | "refunded";
type ConfirmAction = { title: string; description: string; confirmLabel: string; onConfirm: () => void | Promise<void> };
type CompactTabId = "new" | "accepted" | "preparing" | "ready" | "completed";
type CompactPane = "orders" | "kitchen" | "more";
type CompactOrderTypeFilter = NonNullable<TableOrder["orderType"]> | "all";
type KitchenDisplayOrder = TableOrder & {
  orderNumber?: string | number;
  displayOrderNumber?: string | number;
  invoiceNumber?: string;
  billNumber?: string;
};

const desktopColumns: Array<{ id: KitchenColumnId; title: string; tone: string; statuses: TableOrderStatus[] }> = [
  { id: "new", title: "New", tone: "red", statuses: ["new", "occupied"] },
  { id: "accepted", title: "Accepted", tone: "orange", statuses: ["accepted"] },
  { id: "preparing", title: "Preparing", tone: "amber", statuses: ["preparing"] },
  { id: "ready", title: "Ready / Serve", tone: "green", statuses: ["ready", "served"] },
];

const compactTabs: Array<{ id: CompactTabId; label: string; statuses: TableOrderStatus[]; tone: string }> = [
  { id: "new", label: "New", statuses: ["new", "occupied"], tone: "red" },
  { id: "accepted", label: "Accepted", statuses: ["accepted"], tone: "orange" },
  { id: "preparing", label: "Cooking", statuses: ["preparing"], tone: "amber" },
  { id: "ready", label: "Ready", statuses: ["ready", "served"], tone: "green" },
  { id: "completed", label: "Done", statuses: ["completed", "billed"], tone: "slate" },
];

const nextStatus: Partial<Record<TableOrderStatus, TableOrderStatus>> = {
  new: "accepted",
  occupied: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "served",
  served: "completed",
};

const actionLabel: Partial<Record<TableOrderStatus, string>> = {
  new: "Accept",
  occupied: "Accept",
  accepted: "Start Cooking",
  preparing: "Ready",
  ready: "Serve",
  served: "Complete",
};

export function KitchenDisplayFlow() {
  const [fullscreen, setFullscreen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [connectionState, setConnectionState] = useState<"realtime" | "fallback" | "error" | "loading">("loading");
  const [selectedPrinterId, setSelectedPrinterId] = useState("browser-kitchen");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [compactTab, setCompactTab] = useState<CompactTabId>("new");
  const [compactPane, setCompactPane] = useState<CompactPane>("orders");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<TableOrder["source"] | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TableOrder["priority"] | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TableOrderStatus | "all">("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [stationFilter, setStationFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<CompactOrderTypeFilter>("all");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const busyOrders = useRef(new Set<string>());
  const printedThisSession = useRef(new Set<string>());
  const previousAcceptedOrders = useRef(new Set<string>());
  const autoPrintReady = useRef(false);
  const soundReady = useRef(false);
  const alertedOrders = useRef(new Set<string>());
  const lastDelayedToast = useRef(0);
  const { settings, save: savePrinterSettings, log: logPrint } = usePrinterSettings();

  const kitchenPrinters = useMemo(
    () => (settings.profiles ?? []).filter((profile) => profile.type === "kitchen"),
    [settings.profiles],
  );
  const selectedPrinter = kitchenPrinters.find((profile) => profile.id === selectedPrinterId) ?? kitchenPrinters[0];
  const boardOrders = useMemo(() => orders.filter(isVisibleOnBoard).sort((a, b) => sortKitchenOrders(a, b, now)), [now, orders]);
  const stationOptions = useMemo(() => Array.from(new Set(boardOrders.map((order) => order.kitchenStation || stationForOrder(order)).filter(isStringValue))).sort(), [boardOrders]);
  const tableOptions = useMemo(() => Array.from(new Set(boardOrders.map((order) => order.tableNumber).filter(isStringValue))).sort(), [boardOrders]);
  const staffOptions = useMemo(() => Array.from(new Set(boardOrders.map((order) => order.assignedStaffName || order.waiterName).filter(isStringValue))).sort(), [boardOrders]);
  const compactBaseOrders = useMemo(() => filterKitchenOrders(boardOrders, { query, source: sourceFilter, priority: priorityFilter, status: "all", table: tableFilter, station: stationFilter, staff: staffFilter, orderType: orderTypeFilter }), [boardOrders, orderTypeFilter, priorityFilter, query, sourceFilter, staffFilter, stationFilter, tableFilter]);
  const visibleOrders = useMemo(() => filterKitchenOrders(boardOrders, { query, source: sourceFilter, priority: priorityFilter, status: statusFilter, table: tableFilter, station: stationFilter }), [boardOrders, priorityFilter, query, sourceFilter, stationFilter, statusFilter, tableFilter]);
  const compactOrders = useMemo(() => {
    const tab = compactTabs.find((item) => item.id === compactTab) ?? compactTabs[0];
    return compactBaseOrders.filter((order) => tab.statuses.includes(order.status));
  }, [compactBaseOrders, compactTab]);
  const preparingOrders = useMemo(() => visibleOrders.filter((order) => order.status === "preparing"), [visibleOrders]);
  const readyOrders = useMemo(() => visibleOrders.filter((order) => order.status === "ready"), [visibleOrders]);
  const cancellableOrders = useMemo(() => visibleOrders.filter((order) => !isCompleted(order.status)), [visibleOrders]);
  const activeRequests = useMemo(() => tables.flatMap((table) => (table.serviceRequests ?? []).filter((request) => request.status === "open").map((request) => ({ ...request, table: table.table }))).slice(-8).reverse(), [tables]);
  const historyOrders = useMemo(() => orders.filter((order) => isCompleted(order.status) && !isToday(order.createdAt)), [orders]);
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? null, [orders, selectedOrderId]);
  const stats = useMemo(() => buildKitchenStats(visibleOrders, now, settings.connectionStatus, settings.autoPrintOrders), [now, settings.autoPrintOrders, settings.connectionStatus, visibleOrders]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/owner/kitchen", { cache: "no-store", signal: controller.signal }).then((response) => readKitchenPayload<{ data?: TableOrder[] }>(response, "Kitchen orders could not be loaded.")),
      fetch("/api/owner/tables", { cache: "no-store", signal: controller.signal }).then((response) => readKitchenPayload<{ data?: PosTable[] }>(response, "Kitchen tables could not be loaded.")),
    ])
      .then(([payload, tablePayload]) => {
        if (!active) return;
        setOrders(payload.data ?? []);
        setTables(tablePayload.data ?? []);
        setConnectionState("fallback");
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        console.error("[kitchen] bootstrap failed", { reason: error instanceof Error ? error.name : typeof error });
        if (active) {
          setConnectionState("error");
          toast.error("Kitchen board could not be loaded.");
        }
      });
    const events = new EventSource("/api/owner/kitchen/stream");
    events.addEventListener("orders", (event) => {
      if (!active) return;
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { data?: TableOrder[] };
        setOrders(payload.data ?? []);
        setConnectionState("realtime");
      } catch (error) {
        console.error("[kitchen] stream parse failed", { reason: error instanceof Error ? error.name : typeof error });
        setConnectionState("error");
      }
    });
    events.addEventListener("error", () => {
      if (active) setConnectionState((current) => current === "realtime" ? current : "error");
    });
    return () => {
      active = false;
      controller.abort();
      events.close();
    };
  }, []);

  useEffect(() => {
    if (!stats.delayed) {
      lastDelayedToast.current = 0;
      return;
    }
    if (lastDelayedToast.current === stats.delayed) return;
    lastDelayedToast.current = stats.delayed;
    toast(`${stats.delayed} kitchen order${stats.delayed === 1 ? "" : "s"} delayed.`, { icon: "!", className: "sarva-toast sarva-toast-warning" });
    if (soundAlerts) playReadyTone();
  }, [soundAlerts, stats.delayed]);

  const updateStatus = useCallback(async (order: TableOrder, status: TableOrderStatus, options: { silent?: boolean } = {}) => {
    if (busyOrders.current.has(order.id)) return;
    busyOrders.current.add(order.id);
    setBusyOrderId(order.id);
    const previousOrder = orders.find((item) => item.id === order.id) ?? order;
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    try {
      const response = await fetch("/api/owner/kitchen", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.id, status }),
      });
      const payload = await readKitchenPayload<{ data?: TableOrder }>(response, "Kitchen status could not be updated.");
      if (payload.data) setOrders((current) => current.map((item) => item.id === order.id ? payload.data! : item));
      if (!options.silent) toast.success(kitchenActionToast(order, status));
      return true;
    } catch (error) {
      console.error("[kitchen] status update failed", { orderId: order.id, status, reason: error instanceof Error ? error.name : typeof error });
      setOrders((current) => current.map((item) => item.id === order.id ? previousOrder : item));
      setConnectionState("error");
      if (!options.silent) toast.error("Kitchen status could not be updated.");
      return false;
    } finally {
      busyOrders.current.delete(order.id);
      setBusyOrderId(null);
    }
  }, [orders]);

  const showNewOrderNotification = useCallback((order: TableOrder) => {
    const id = `new-order-${order.id}`;
    const view = () => {
      setSelectedOrderId(order.id);
      setHighlightedOrderId(order.id);
      setCompactPane("orders");
      setCompactTab("new");
      toast.dismiss(id);
      window.setTimeout(() => setHighlightedOrderId((current) => current === order.id ? null : current), 8000);
    };
    toast.custom((item) => (
      <div className={cn("w-[min(92vw,360px)] rounded-xl border bg-white p-3 text-left shadow-2xl", item.visible ? "animate-in slide-in-from-top-2" : "animate-out fade-out")}>
        <button type="button" onClick={view} className="flex w-full items-start gap-3 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-600"><BellRing className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-slate-950">New Order #{displayOrderNumber(order)}</span>
            <span className="mt-1 block text-xs font-bold text-slate-600">{order.tableNumber} · {order.lines.length} item{order.lines.length === 1 ? "" : "s"} · {order.orderType ? readableKitchenOrderType(order.orderType) : "Dine in"}</span>
          </span>
        </button>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={view}>View</Button>
          <Button size="sm" onClick={() => { void updateStatus(order, "accepted"); toast.dismiss(id); }}>Accept</Button>
          <Button variant="outline" size="sm" onClick={() => toast.dismiss(id)}>Dismiss</Button>
        </div>
      </div>
    ), { id, duration: 12000, position: window.innerWidth < 768 ? "top-center" : "top-right" });
  }, [updateStatus]);

  useEffect(() => {
    if (connectionState === "loading") return;
    const currentNewOrders = boardOrders.filter((order) => ["new", "occupied"].includes(order.status));
    if (!soundReady.current) {
      currentNewOrders.forEach((order) => alertedOrders.current.add(order.id));
      soundReady.current = true;
      return;
    }
    if (!soundAlerts) return;
    currentNewOrders.forEach((order) => {
      if (alertedOrders.current.has(order.id)) return;
      alertedOrders.current.add(order.id);
      showNewOrderNotification(order);
      playReadyTone();
    });
  }, [boardOrders, connectionState, showNewOrderNotification, soundAlerts]);

  const printKot = useCallback(async (order: TableOrder, options: { auto?: boolean; reprint?: boolean } = {}) => {
    const jobId = `${order.id}:${options.reprint ? "reprint" : "print"}`;
    if (!options.reprint && printedThisSession.current.has(jobId)) return;
    printedThisSession.current.add(jobId);
    const printed = openKitchenTicket(order, selectedPrinter, { print: true });
    if (!printed) {
      printedThisSession.current.delete(jobId);
      if (!options.auto) toast.error("Allow browser popups to print KOT.");
      return;
    }
    try {
      await Promise.all([
        logPrint({
          type: "kot",
          status: options.reprint ? "reprint" : "printed",
          user: "Kitchen",
          branchId: order.branchId ?? "main",
          printerProfileId: selectedPrinter?.id ?? "browser-kitchen",
          referenceId: order.id,
        }),
        fetch("/api/owner/kitchen", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: order.id, printedCountIncrement: 1 }),
        }).catch(() => undefined),
      ]);
    } catch (error) {
      console.error("[kitchen] print log failed", { orderId: order.id, reason: error instanceof Error ? error.name : typeof error });
      if (!options.auto) toast.error("KOT printed, but the print log could not be saved.");
    }
    if (!options.auto) toast.success(options.reprint ? "KOT reprint sent." : "KOT print sent.");
  }, [logPrint, selectedPrinter]);

  useEffect(() => {
    if (!settings.autoPrintOrders) {
      previousAcceptedOrders.current = new Set();
      autoPrintReady.current = false;
      return;
    }
    const acceptedOrders = boardOrders.filter((order) => order.status === "accepted");
    const acceptedOrderIds = new Set(acceptedOrders.map((order) => order.id));
    if (!autoPrintReady.current) {
      previousAcceptedOrders.current = acceptedOrderIds;
      autoPrintReady.current = true;
      return;
    }
    acceptedOrders
      .filter((order) => !previousAcceptedOrders.current.has(order.id))
      .forEach((order) => {
        if (!printedThisSession.current.has(`${order.id}:print`) && !order.printedCount) {
          void printKot(order, { auto: true });
        }
      });
    previousAcceptedOrders.current = acceptedOrderIds;
  }, [boardOrders, printKot, settings.autoPrintOrders]);

  async function toggleAutoPrint() {
    try {
      await savePrinterSettings({ ...settings, autoPrintOrders: !settings.autoPrintOrders });
      toast.success(`Auto KOT printing ${settings.autoPrintOrders ? "disabled" : "enabled"}.`);
    } catch (error) {
      console.error("[kitchen] printer setting update failed", { reason: error instanceof Error ? error.name : typeof error });
      toast.error("Kitchen printer setting could not be saved.");
    }
  }

  async function bulkUpdateStatus(targetOrders: TableOrder[], status: TableOrderStatus) {
    if (!targetOrders.length) return;
    const previousOrders = orders;
    const results = await Promise.all(targetOrders.map((order) => updateStatus(order, status, { silent: true })));
    const successCount = results.filter(Boolean).length;
    if (successCount === targetOrders.length) {
      toast.success(`${successCount} kitchen order${successCount === 1 ? "" : "s"} moved to ${statusLabel(status)}.`);
      return;
    }
    setOrders(previousOrders);
    toast.error("Bulk kitchen update was not fully applied. The board was restored.");
  }

  function previewKot(order: TableOrder) {
    const opened = openKitchenTicket(order, selectedPrinter, { print: false });
    if (opened) toast.success("KOT preview opened.");
    else toast.error("Allow browser popups to preview KOT.");
  }

  function requestCancel(order: TableOrder) {
    setConfirmAction({
      title: "Cancel kitchen ticket?",
      description: `Cancel ${order.tableNumber} / ${order.id}. This keeps the ticket visible for today's audit trail.`,
      confirmLabel: "Cancel ticket",
      onConfirm: async () => {
        setConfirmAction(null);
        await updateStatus(order, "cancelled");
      },
    });
  }

  function requestBulkCancel() {
    setConfirmAction({
      title: "Cancel visible active tickets?",
      description: `Cancel ${cancellableOrders.length} visible active kitchen ticket${cancellableOrders.length === 1 ? "" : "s"}.`,
      confirmLabel: "Cancel tickets",
      onConfirm: async () => {
        setConfirmAction(null);
        await bulkUpdateStatus(cancellableOrders, "cancelled");
      },
    });
  }

  return (
    <div className={cn(fullscreen ? "fixed inset-0 z-50 overflow-auto bg-slate-50 min-[1025px]:p-4" : "", "kitchen-ops-center")}>
      <div className="min-[1025px]:hidden">
        <CompactKitchenBoard
          autoPrint={settings.autoPrintOrders}
          busyOrderId={busyOrderId}
          compactBaseOrders={compactBaseOrders}
          compactOrders={compactOrders}
          compactPane={compactPane}
          compactTab={compactTab}
          connectionState={connectionState}
          filtersOpen={filtersOpen}
          historyOrders={historyOrders}
          highlightedOrderId={highlightedOrderId}
          now={now}
          selectedPrinter={selectedPrinter}
          selectedPrinterId={selectedPrinterId}
          kitchenPrinters={kitchenPrinters}
          orderTypeFilter={orderTypeFilter}
          soundAlerts={soundAlerts}
          stats={stats}
          summaryOpen={summaryOpen}
          staffFilter={staffFilter}
          staffOptions={staffOptions}
          stationOptions={stationOptions}
          tableOptions={tableOptions}
          sourceFilter={sourceFilter}
          priorityFilter={priorityFilter}
          tableFilter={tableFilter}
          stationFilter={stationFilter}
          query={query}
          onCancel={requestCancel}
          onClearFilters={() => { setQuery(""); setSourceFilter("all"); setPriorityFilter("all"); setStatusFilter("all"); setTableFilter("all"); setStationFilter("all"); setStaffFilter("all"); setOrderTypeFilter("all"); }}
          onFilterOpenChange={setFiltersOpen}
          onOrderTypeChange={setOrderTypeFilter}
          onPaneChange={setCompactPane}
          onPreview={previewKot}
          onPrint={(order, reprint) => void printKot(order, { reprint })}
          onPrinterChange={setSelectedPrinterId}
          onQueryChange={setQuery}
          onRefresh={() => window.location.reload()}
          onSoundToggle={() => setSoundAlerts((value) => !value)}
          onSourceChange={setSourceFilter}
          onStaffChange={setStaffFilter}
          onPriorityChange={setPriorityFilter}
          onStationChange={setStationFilter}
          onSummaryToggle={() => setSummaryOpen((value) => !value)}
          onTableChange={setTableFilter}
          onTabChange={setCompactTab}
          onToggleAutoPrint={toggleAutoPrint}
          onNext={(order, status) => void updateStatus(order, status)}
          onReprint={(order) => void printKot(order, { reprint: true })}
        />
      </div>
      <div className="hidden min-h-[calc(100vh-96px)] space-y-3 min-[1025px]:block">
      <header className="sticky top-0 z-30 -mx-1 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-slate-50/95 px-1 py-2 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-xl font-black text-slate-950">Kitchen Operations Center</h1>
          <Badge variant={connectionState === "realtime" ? "success" : connectionState === "error" ? "warning" : "muted"}>
            {connectionState === "realtime" ? "Live" : connectionState === "loading" ? "Loading" : connectionState === "error" ? "Sync issue" : "Snapshot"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-black text-slate-600">
            <Printer className="size-4" />
            <select className="max-w-52 bg-transparent text-sm font-bold outline-none" value={selectedPrinter?.id ?? selectedPrinterId} onChange={(event) => setSelectedPrinterId(event.target.value)} aria-label="Select kitchen printer">
              {(kitchenPrinters.length ? kitchenPrinters : [{ id: "browser-kitchen", name: "Browser print", paperWidth: "80mm" } as PrinterProfile]).map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name} ({profile.paperWidth})</option>
              ))}
            </select>
          </label>
          <Button variant={settings.autoPrintOrders ? "default" : "outline"} onClick={toggleAutoPrint} title="Toggle automatic KOT printing">
            <Printer className="size-4" />Auto Print {settings.autoPrintOrders ? "ON" : "OFF"}
          </Button>
          <Button variant={filtersOpen ? "default" : "outline"} onClick={() => setFiltersOpen((value) => !value)} title="Filter kitchen orders"><Filter className="size-4" />Filter</Button>
          <Button variant={settingsOpen ? "default" : "outline"} onClick={() => setSettingsOpen((value) => !value)} title="Kitchen settings"><Settings2 className="size-4" />Settings</Button>
          <Button variant="outline" asChild title="Kitchen order history"><Link href="/owner/kitchen/history"><History className="size-4" />History</Link></Button>
          <Button variant="outline" onClick={() => setFullscreen((value) => !value)} title="Toggle kitchen full screen"><Maximize2 className="size-4" />{fullscreen ? "Exit" : "Full"}</Button>
        </div>
      </header>

      {filtersOpen ? (
        <section className="grid gap-2 rounded-lg border bg-white p-2 shadow-sm lg:grid-cols-[160px_160px_160px_160px_160px_auto]">
          <select className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as TableOrder["source"] | "all")} aria-label="Filter by source">
            <option value="all">All sources</option>
            {(["QR", "Waiter", "POS", "Takeaway", "Parcel", "Delivery"] as TableOrder["source"][]).map((source) => <option key={source} value={source}>{source}</option>)}
          </select>
          <select className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as TableOrder["priority"] | "all")} aria-label="Filter by priority">
            <option value="all">All priority</option>
            <option value="rush">Rush only</option>
            <option value="normal">Normal only</option>
          </select>
          <select className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TableOrderStatus | "all")} aria-label="Filter by status">
            <option value="all">All status</option>
            {(["new", "accepted", "preparing", "ready", "served", "completed", "cancelled"] as TableOrderStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
          <select className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold" value={tableFilter} onChange={(event) => setTableFilter(event.target.value)} aria-label="Filter by table">
            <option value="all">All tables</option>
            {tableOptions.map((table) => <option key={table} value={table}>{table}</option>)}
          </select>
          <select className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold" value={stationFilter} onChange={(event) => setStationFilter(event.target.value)} aria-label="Filter by kitchen station">
            <option value="all">All stations</option>
            {stationOptions.map((station) => <option key={station} value={station}>{station}</option>)}
          </select>
          <Button variant="outline" onClick={() => { setSourceFilter("all"); setPriorityFilter("all"); setStatusFilter("all"); setTableFilter("all"); setStationFilter("all"); }}>Clear</Button>
        </section>
      ) : null}

      <section className="grid gap-2 xl:grid-cols-9">
        <KitchenMetric label="New Orders" value={stats.newOrders} tone="red" />
        <KitchenMetric label="Accepted" value={stats.accepted} tone="orange" />
        <KitchenMetric label="Preparing" value={stats.preparing} tone="amber" />
        <KitchenMetric label="Ready" value={stats.ready} tone="green" />
        <KitchenMetric label="Delayed" value={stats.delayed} tone="red" />
        <KitchenMetric label="Completed" value={stats.completedToday} tone="blue" />
        <KitchenMetric label="Avg Prep" value={`${stats.averagePrep}m`} tone="slate" />
        <KitchenMetric label="High Priority" value={stats.priority} tone="orange" />
        <KitchenMetric label="Critical" value={stats.critical} tone="red" />
      </section>

      {settingsOpen ? (
        <section className="grid gap-3 rounded-lg border bg-white p-3 shadow-sm md:grid-cols-5">
          <Button variant={soundAlerts ? "default" : "outline"} onClick={() => setSoundAlerts((value) => !value)} title="Toggle one-time new order sound alerts">
            <Volume2 className="size-4" />Sound Alerts {soundAlerts ? "ON" : "OFF"}
          </Button>
          <Button variant={settings.autoPrintOrders ? "default" : "outline"} onClick={toggleAutoPrint} title="Toggle automatic KOT printing">
            <Printer className="size-4" />Auto Print {settings.autoPrintOrders ? "ON" : "OFF"}
          </Button>
          <Button variant="outline" onClick={() => void bulkUpdateStatus(preparingOrders, "ready")} disabled={!preparingOrders.length} title="Mark all preparing orders ready"><CheckCircle2 className="size-4" />Bulk Ready</Button>
          <Button variant="outline" onClick={() => void bulkUpdateStatus(readyOrders, "served")} disabled={!readyOrders.length} title="Serve all ready orders"><CheckCircle2 className="size-4" />Serve Ready</Button>
          <Button variant="outline" className="text-red-600" onClick={requestBulkCancel} disabled={!cancellableOrders.length} title="Cancel all visible active kitchen tickets"><XCircle className="size-4" />Bulk Cancel</Button>
          <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            {visibleOrders.length} visible / {boardOrders.length} board orders
          </div>
        </section>
      ) : null}

      {activeRequests.length ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-950"><BellRing className="size-4" />Open waiter requests</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeRequests.map((request) => (
              <div key={`${request.table}-${request.id}-${request.at}`} className="min-w-44 rounded-lg bg-white p-3 text-xs font-bold text-slate-700 shadow-sm">
                <p className="text-slate-950">{request.table} · {request.type.replace(/-/g, " ")}</p>
                <p className="mt-1 text-slate-500">{request.message || request.type}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-3 gap-2 rounded-xl border bg-white p-2 shadow-sm md:hidden">
        {(["all", "new", "accepted", "preparing", "ready", "completed"] as Array<TableOrderStatus | "all">).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn("min-h-11 rounded-lg px-2 text-xs font-black", statusFilter === status ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700")}
          >
            {status === "all" ? "All" : statusLabel(status)}
          </button>
        ))}
      </section>

      <section className="pb-2">
        {!visibleOrders.length ? (
          <p className="mb-3 rounded-xl border border-dashed bg-white p-6 text-center text-sm font-semibold text-slate-500">
            No kitchen orders match the current filters.
          </p>
        ) : null}
        <div className="grid gap-3 xl:grid-cols-4">
          {desktopColumns.map((column) => {
            const columnOrders = visibleOrders.filter((order) => column.statuses.includes(order.status));
            return (
              <div key={column.id} className={cn("max-h-[calc(100vh-270px)] overflow-y-auto rounded-lg border bg-white shadow-sm", statusFilter !== "all" && !column.statuses.includes(statusFilter) && "hidden", columnBorder(column.tone))}>
                <div className={cn("sticky top-0 z-10 flex items-center justify-between border-b px-3 py-2", columnHeader(column.tone))}>
                  <h2 className="text-sm font-black uppercase">{column.title}</h2>
                  <Badge variant="secondary">{columnOrders.length}</Badge>
                </div>
                <div className="grid gap-3 p-3">
                  {columnOrders.map((order) => (
                    <KitchenOrderCard
                      key={order.id}
                      order={order}
                      now={now}
                      busy={busyOrderId === order.id}
                      highlighted={highlightedOrderId === order.id}
                      onPrint={(reprint) => void printKot(order, { reprint })}
                      onPreview={() => previewKot(order)}
                      onOpen={() => setSelectedOrderId(order.id)}
                      onNext={(status) => void updateStatus(order, status)}
                      onCancel={() => requestCancel(order)}
                    />
                  ))}
                  {!columnOrders.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm font-semibold text-slate-500">No orders</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white">
        <span>Priority Guide: High (Urgent) · Medium (Delayed) · Low (Normal)</span>
        <span className="flex gap-4"><span>Auto KOT: {settings.autoPrintOrders ? "ON" : "OFF"}</span><span>Sound Alerts: {soundAlerts ? "ON" : "OFF"}</span></span>
      </footer>
      </div>
      {confirmAction ? (
        <KitchenConfirmDialog
          title={confirmAction.title}
          description={confirmAction.description}
          confirmLabel={confirmAction.confirmLabel}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
        />
      ) : null}
      {selectedOrder ? (
        <KitchenOrderDrawer
          order={selectedOrder}
          now={now}
          onClose={() => setSelectedOrderId(null)}
          onPrint={() => void printKot(selectedOrder, { reprint: Boolean(selectedOrder.printedCount) })}
          onPreview={() => previewKot(selectedOrder)}
          onNext={(status) => void updateStatus(selectedOrder, status)}
        />
      ) : null}
    </div>
  );
}

export function KitchenOrderHistoryFlow() {
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<"today" | "yesterday" | "7d" | "month" | "all">("today");
  const [status, setStatus] = useState<TableOrderStatus | "all">("all");
  const [payment, setPayment] = useState<PaymentState | "all">("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void fetch("/api/owner/kitchen", { cache: "no-store", signal: controller.signal })
      .then((response) => readKitchenPayload<{ data?: TableOrder[] }>(response, "Kitchen history could not be loaded."))
      .then((payload) => {
        if (active) setOrders(payload.data ?? []);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") toast.error("Kitchen history could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return orders
      .filter((order) => matchesDateRange(order.createdAt, range))
      .filter((order) => status === "all" || order.status === status)
      .filter((order) => payment === "all" || order.paymentStatus === payment)
      .filter((order) => !search || [
        displayOrderNumber(order),
        order.id,
        order.tableNumber,
        order.customerName,
        order.guestName,
        order.assignedStaffName,
        order.waiterName,
        order.source,
        order.orderType,
        paymentLabel(order.paymentStatus),
        ...order.lines.map((line) => line.name),
      ].filter(Boolean).join(" ").toLowerCase().includes(search))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [orders, payment, query, range, status]);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  return (
    <main className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Kitchen Order History</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Search completed, cancelled, and active kitchen tickets by order number, table, staff, payment, and item.</p>
        </div>
        <Button variant="outline" asChild><Link href="/owner/kitchen"><UtensilsCrossed className="size-4" />Kitchen Operations</Link></Button>
      </header>
      <section className="grid gap-2 rounded-lg border bg-white p-3 shadow-sm xl:grid-cols-[minmax(220px,1fr)_150px_150px_150px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-orange-500" placeholder="Search order number, table, customer, item" aria-label="Search kitchen history" />
        </label>
        <select className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold" value={range} onChange={(event) => setRange(event.target.value as typeof range)} aria-label="Date range">
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7d">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="all">Past / Future</option>
        </select>
        <select className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold" value={status} onChange={(event) => setStatus(event.target.value as TableOrderStatus | "all")} aria-label="Status">
          <option value="all">All status</option>
          {(["new", "accepted", "preparing", "ready", "served", "completed", "billed", "cancelled"] as TableOrderStatus[]).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
        </select>
        <select className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold" value={payment} onChange={(event) => setPayment(event.target.value as PaymentState | "all")} aria-label="Payment">
          <option value="all">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
      </section>
      <section className="rounded-lg border bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b px-4 py-3 text-xs font-black uppercase text-slate-500">
          <span>Order</span><span>Table / Customer</span><span>Status</span><span>Payment</span><span>Staff</span><span>Print</span>
        </div>
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
          {filtered.map((order) => (
            <button key={order.id} type="button" onClick={() => setSelectedOrderId(order.id)} className="grid w-full grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b px-4 py-3 text-left text-sm hover:bg-orange-50">
              <span className="font-black text-slate-950">#{displayOrderNumber(order)}<small className="mt-1 block font-semibold text-slate-500">{timeOnly(order.createdAt)}</small></span>
              <span className="font-bold text-slate-700">{order.tableNumber}<small className="mt-1 block truncate font-semibold text-slate-500">{order.customerName || order.guestName || "Walk-in"}</small></span>
              <span><Badge variant={order.status === "cancelled" ? "destructive" : isCompleted(order.status) ? "success" : "warning"}>{statusLabel(order.status)}</Badge></span>
              <span className="font-bold text-slate-700">{paymentLabel(order.paymentStatus)}</span>
              <span className="truncate font-bold text-slate-700">{order.assignedStaffName || order.waiterName || "Unassigned"}</span>
              <span className="text-right font-black text-slate-600">{order.printedCount ?? 0}</span>
            </button>
          ))}
          {!filtered.length ? <p className="p-8 text-center text-sm font-semibold text-slate-500">{loading ? "Loading kitchen history..." : "No kitchen orders match the selected filters."}</p> : null}
        </div>
      </section>
      {selectedOrder ? (
        <KitchenOrderDrawer
          order={selectedOrder}
          now={now}
          onClose={() => setSelectedOrderId(null)}
          onPrint={() => toast("Open Kitchen Operations to print or reprint KOT.")}
          onPreview={() => toast("Open Kitchen Operations to preview KOT.")}
          onNext={() => undefined}
        />
      ) : null}
    </main>
  );
}

function KitchenMetric({ label, value, tone, compact }: { label: string; value: string | number; tone: "red" | "orange" | "amber" | "green" | "blue" | "violet" | "slate"; compact?: boolean }) {
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="flex h-16 items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-500">{label}</p>
          <p className={cn("mt-0.5 font-black text-slate-950", compact ? "truncate text-sm" : "text-xl")}>{value}</p>
        </div>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", iconTone(tone))}>
          {tone === "red" ? <BellRing className="size-4" /> : tone === "amber" || tone === "orange" ? <Timer className="size-4" /> : <CheckCircle2 className="size-4" />}
        </span>
      </CardContent>
    </Card>
  );
}

function CompactKitchenBoard({
  autoPrint,
  busyOrderId,
  compactBaseOrders,
  compactOrders,
  compactPane,
  compactTab,
  connectionState,
  filtersOpen,
  historyOrders,
  highlightedOrderId,
  kitchenPrinters,
  now,
  orderTypeFilter,
  priorityFilter,
  query,
  selectedPrinter,
  selectedPrinterId,
  soundAlerts,
  sourceFilter,
  staffFilter,
  staffOptions,
  stationFilter,
  stationOptions,
  stats,
  summaryOpen,
  tableFilter,
  tableOptions,
  onCancel,
  onClearFilters,
  onFilterOpenChange,
  onNext,
  onOrderTypeChange,
  onPaneChange,
  onPreview,
  onPrint,
  onPrinterChange,
  onPriorityChange,
  onQueryChange,
  onRefresh,
  onReprint,
  onSoundToggle,
  onSourceChange,
  onStaffChange,
  onStationChange,
  onSummaryToggle,
  onTableChange,
  onTabChange,
  onToggleAutoPrint,
}: {
  autoPrint: boolean;
  busyOrderId: string | null;
  compactBaseOrders: TableOrder[];
  compactOrders: TableOrder[];
  compactPane: CompactPane;
  compactTab: CompactTabId;
  connectionState: "realtime" | "fallback" | "error" | "loading";
  filtersOpen: boolean;
  historyOrders: TableOrder[];
  highlightedOrderId: string | null;
  kitchenPrinters: PrinterProfile[];
  now: number;
  orderTypeFilter: CompactOrderTypeFilter;
  priorityFilter: TableOrder["priority"] | "all";
  query: string;
  selectedPrinter: PrinterProfile | undefined;
  selectedPrinterId: string;
  soundAlerts: boolean;
  sourceFilter: TableOrder["source"] | "all";
  staffFilter: string;
  staffOptions: string[];
  stationFilter: string;
  stationOptions: string[];
  stats: ReturnType<typeof buildKitchenStats>;
  summaryOpen: boolean;
  tableFilter: string;
  tableOptions: string[];
  onCancel: (order: TableOrder) => void;
  onClearFilters: () => void;
  onFilterOpenChange: (open: boolean) => void;
  onNext: (order: TableOrder, status: TableOrderStatus) => void;
  onOrderTypeChange: (orderType: CompactOrderTypeFilter) => void;
  onPaneChange: (pane: CompactPane) => void;
  onPreview: (order: TableOrder) => void;
  onPrint: (order: TableOrder, reprint: boolean) => void;
  onPrinterChange: (id: string) => void;
  onPriorityChange: (priority: TableOrder["priority"] | "all") => void;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  onReprint: (order: TableOrder) => void;
  onSoundToggle: () => void;
  onSourceChange: (source: TableOrder["source"] | "all") => void;
  onStaffChange: (staff: string) => void;
  onStationChange: (station: string) => void;
  onSummaryToggle: () => void;
  onTableChange: (table: string) => void;
  onTabChange: (tab: CompactTabId) => void;
  onToggleAutoPrint: () => void | Promise<void>;
}) {
  const activeTab = compactTabs.find((tab) => tab.id === compactTab) ?? compactTabs[0];
  const visibleCards = compactOrders.slice(0, 40);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFilterOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen, onFilterOpenChange]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      <main className="mx-auto max-w-5xl space-y-3 px-3 py-3">
        <section className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black">Kitchen Operations</h1>
            <p className="mt-1 text-xs font-bold text-slate-500">Orders {connectionState === "realtime" ? "Live" : connectionState === "loading" ? "Loading" : "Snapshot"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={connectionState === "error" ? "warning" : "success"}>{connectionState === "error" ? "Sync" : "Live"}</Badge>
            <Button variant="outline" className="h-11 px-3" onClick={() => onFilterOpenChange(true)} aria-label="Open kitchen filters">
              <Filter className="size-4" />Filter
            </Button>
          </div>
        </section>

        <section className="rounded-xl border bg-white shadow-sm">
          <button type="button" onClick={onSummaryToggle} className="flex min-h-12 w-full items-center justify-between px-3 text-sm font-black" aria-expanded={summaryOpen}>
            Today&apos;s Summary
            <ChevronDown className={cn("size-4 transition-transform", summaryOpen && "rotate-180")} />
          </button>
          {summaryOpen ? (
            <div className="grid grid-cols-3 gap-2 border-t p-3 sm:grid-cols-6">
              <CompactMetric label="Orders" value={compactBaseOrders.length} tone="orange" />
              <CompactMetric label="New" value={stats.newOrders} tone="red" />
              <CompactMetric label="Cooking" value={stats.preparing} tone="amber" />
              <CompactMetric label="Ready" value={stats.ready} tone="green" />
              <CompactMetric label="Delayed" value={stats.delayed} tone="red" />
              <CompactMetric label="Printer" value={stats.printerLabel} tone={stats.printerOnline ? "green" : "slate"} />
            </div>
          ) : null}
        </section>

        <section className="sticky top-0 z-30 -mx-3 overflow-x-auto border-y bg-white px-3 py-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            {compactTabs.map((tab) => {
              const count = compactBaseOrders.filter((order) => tab.statuses.includes(order.status)).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { onPaneChange("orders"); onTabChange(tab.id); }}
                  className={cn("min-h-11 rounded-lg border px-3 text-sm font-black transition-colors", compactTab === tab.id ? compactTabTone(tab.tone) : "border-slate-200 bg-white text-slate-600")}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        </section>

        {compactPane === "orders" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase" style={{ color: compactTitleColor(activeTab.tone) }}>{activeTab.label} Orders ({compactOrders.length})</h2>
              <button type="button" onClick={onRefresh} className="hidden rounded-lg px-2 py-1 text-xs font-black text-slate-500 sm:inline-flex">Refresh</button>
            </div>
            <div className="grid gap-3 min-[769px]:grid-cols-2">
              {visibleCards.map((order) => (
                <CompactKitchenOrderCard
                  key={order.id}
                  busy={busyOrderId === order.id}
                  highlighted={highlightedOrderId === order.id}
                  now={now}
                  order={order}
                  onCancel={() => onCancel(order)}
                  onNext={(status) => onNext(order, status)}
                  onPreview={() => onPreview(order)}
                  onPrint={(reprint) => onPrint(order, reprint)}
                />
              ))}
              {!compactOrders.length ? <p className="rounded-xl border border-dashed bg-white p-6 text-center text-sm font-bold text-slate-500 min-[769px]:col-span-2">No {activeTab.label.toLowerCase()} orders.</p> : null}
              {compactOrders.length > visibleCards.length ? <p className="rounded-xl border bg-white p-4 text-center text-sm font-bold text-slate-500 min-[769px]:col-span-2">Showing first {visibleCards.length} orders. Use filters to narrow the queue.</p> : null}
            </div>
          </section>
        ) : null}

        {compactPane === "kitchen" ? (
          <section className="grid gap-3 min-[769px]:grid-cols-2">
            <QuickAction title="Auto Print" value={autoPrint ? "ON" : "OFF"} icon={<Printer className="size-5" />} onClick={() => void onToggleAutoPrint()} />
            <QuickAction title="Sound" value={soundAlerts ? "ON" : "OFF"} icon={<Volume2 className="size-5" />} onClick={onSoundToggle} />
            <QuickAction title="KOT Preview" value="Open" icon={<Eye className="size-5" />} onClick={() => compactOrders[0] && onPreview(compactOrders[0])} />
            <QuickAction title="Refresh" value="Now" icon={<RefreshCw className="size-5" />} onClick={onRefresh} />
          </section>
        ) : null}

        {compactPane === "more" ? (
          <section className="space-y-3">
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <h2 className="text-sm font-black uppercase text-slate-700">Printer</h2>
              <select className="mt-3 h-11 w-full rounded-lg border bg-white px-3 text-sm font-bold" value={selectedPrinter?.id ?? selectedPrinterId} onChange={(event) => onPrinterChange(event.target.value)} aria-label="Select kitchen printer">
                {(kitchenPrinters.length ? kitchenPrinters : [{ id: "browser-kitchen", name: "Browser print", paperWidth: "80mm" } as PrinterProfile]).map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name} ({profile.paperWidth})</option>
                ))}
              </select>
            </div>
            <PrintPanel orders={compactBaseOrders} onReprint={onReprint} />
            <HistoryPanel orders={historyOrders} />
          </section>
        ) : null}
      </main>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 min-[1025px]:hidden" role="presentation" onClick={() => onFilterOpenChange(false)}>
          <section role="dialog" aria-modal="true" aria-label="Kitchen filters" className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">Filter</h2>
              <Button variant="ghost" onClick={() => onFilterOpenChange(false)}>Close</Button>
            </div>
            <div className="grid gap-3">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => onQueryChange(event.target.value)} className="h-11 w-full rounded-lg border bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder="Search order, table, customer, item" aria-label="Search kitchen orders" />
              </label>
              <select className="h-11 rounded-lg border bg-white px-3 text-sm font-semibold" value={priorityFilter} onChange={(event) => onPriorityChange(event.target.value as TableOrder["priority"] | "all")} aria-label="Filter priority">
                <option value="all">All priority</option>
                <option value="rush">High priority</option>
                <option value="normal">Normal priority</option>
              </select>
              <select className="h-11 rounded-lg border bg-white px-3 text-sm font-semibold" value={sourceFilter} onChange={(event) => onSourceChange(event.target.value as TableOrder["source"] | "all")} aria-label="Filter order source">
                <option value="all">All order types</option>
                {(["QR", "Waiter", "POS", "Takeaway", "Parcel", "Delivery"] as TableOrder["source"][]).map((source) => <option key={source} value={source}>{source}</option>)}
              </select>
              <select className="h-11 rounded-lg border bg-white px-3 text-sm font-semibold" value={orderTypeFilter} onChange={(event) => onOrderTypeChange(event.target.value as CompactOrderTypeFilter)} aria-label="Filter fulfillment type">
                <option value="all">All fulfillment</option>
                <option value="dine-in">Dine in</option>
                <option value="parcel">Parcel</option>
                <option value="takeaway">Takeaway</option>
                <option value="delivery">Delivery</option>
              </select>
              <select className="h-11 rounded-lg border bg-white px-3 text-sm font-semibold" value={tableFilter} onChange={(event) => onTableChange(event.target.value)} aria-label="Filter table">
                <option value="all">All tables</option>
                {tableOptions.map((table) => <option key={table} value={table}>{table}</option>)}
              </select>
              <select className="h-11 rounded-lg border bg-white px-3 text-sm font-semibold" value={stationFilter} onChange={(event) => onStationChange(event.target.value)} aria-label="Filter station">
                <option value="all">All stations</option>
                {stationOptions.map((station) => <option key={station} value={station}>{station}</option>)}
              </select>
              <select className="h-11 rounded-lg border bg-white px-3 text-sm font-semibold" value={staffFilter} onChange={(event) => onStaffChange(event.target.value)} aria-label="Filter staff">
                <option value="all">All staff</option>
                {staffOptions.map((staff) => <option key={staff} value={staff}>{staff}</option>)}
              </select>
              <select className="h-11 rounded-lg border bg-white px-3 text-sm font-semibold" value={selectedPrinter?.id ?? selectedPrinterId} onChange={(event) => onPrinterChange(event.target.value)} aria-label="Select printer">
                {(kitchenPrinters.length ? kitchenPrinters : [{ id: "browser-kitchen", name: "Browser print", paperWidth: "80mm" } as PrinterProfile]).map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name} ({profile.paperWidth})</option>
                ))}
              </select>
              <label className="flex min-h-11 items-center justify-between rounded-lg border px-3 text-sm font-black">
                Auto Print
                <input type="checkbox" checked={autoPrint} onChange={() => void onToggleAutoPrint()} aria-label="Toggle auto print" />
              </label>
              <label className="flex min-h-11 items-center justify-between rounded-lg border px-3 text-sm font-black">
                Sound
                <input type="checkbox" checked={soundAlerts} onChange={onSoundToggle} aria-label="Toggle sound alerts" />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={onClearFilters}>Clear</Button>
              <Button onClick={() => onFilterOpenChange(false)}>Apply</Button>
            </div>
          </section>
        </div>
      ) : null}

      {connectionState !== "realtime" ? (
        <button type="button" onClick={onRefresh} className="fixed bottom-24 right-4 z-40 grid size-12 place-items-center rounded-full bg-orange-600 text-white shadow-xl min-[1025px]:hidden" aria-label="Refresh kitchen orders">
          <RefreshCw className="size-5" />
        </button>
      ) : null}

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 rounded-xl border bg-white p-2 shadow-xl min-[1025px]:hidden" aria-label="Kitchen mobile navigation">
        {([
          ["orders", "Orders", <BellRing key="orders" className="size-5" />],
          ["kitchen", "Kitchen", <UtensilsCrossed key="kitchen" className="size-5" />],
          ["more", "More", <MoreHorizontal key="more" className="size-5" />],
        ] as Array<[CompactPane, string, ReactNode]>).map(([pane, label, icon]) => (
          <button key={pane} type="button" onClick={() => onPaneChange(pane)} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-xs font-black", compactPane === pane ? "bg-orange-50 text-orange-600" : "text-slate-500")}>
            {icon}
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function CompactMetric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-2">
      <p className="truncate text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className={cn("mt-1 truncate text-base font-black", compactTextTone(tone))}>{value}</p>
    </div>
  );
}

function QuickAction({ title, value, icon, onClick }: { title: string; value: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border bg-white p-3 text-center shadow-sm">
      <span className="text-slate-700">{icon}</span>
      <span className="text-sm font-black">{title}</span>
      <Badge variant={value === "ON" ? "success" : "secondary"}>{value}</Badge>
    </button>
  );
}

function CompactKitchenOrderCard({ order, now, busy, highlighted, onNext, onPrint, onPreview, onCancel }: { order: TableOrder; now: number; busy: boolean; highlighted: boolean; onNext: (status: TableOrderStatus) => void; onPrint: (reprint: boolean) => void; onPreview: () => void; onCancel: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const startX = useRef(0);
  const longPress = useRef<number | null>(null);
  const createdMs = Date.parse(order.createdAt);
  const ageMinutes = Number.isFinite(createdMs) ? Math.max(0, Math.round((now - createdMs) / 60000)) : 0;
  const delay = getKitchenDelay(order, now);
  const delayed = delay.delayed;
  const next = nextStatus[order.status];
  const final = isCompleted(order.status);
  const label = actionLabel[order.status] ?? readyActionLabel(order);
  const visibleLines = expanded ? order.lines : order.lines.slice(0, 2);
  const hiddenCount = Math.max(0, order.lines.length - visibleLines.length);
  const priorityTone = delay.priority === "critical" ? "border-l-red-600" : delay.priority === "high" ? "border-l-red-500" : delayed ? "border-l-orange-500" : "border-l-emerald-500";
  const channel = order.source || order.orderType || "POS";

  function clearLongPress() {
    if (longPress.current) window.clearTimeout(longPress.current);
    longPress.current = null;
  }

  return (
    <article
      className={cn("overflow-hidden rounded-xl border border-l-4 bg-white shadow-sm", priorityTone, highlighted && "ring-2 ring-orange-400 ring-offset-2", delayed && "border-red-300 bg-red-50/50 kitchen-delay-pulse")}
      aria-label={delayed ? `${order.tableNumber} delayed by ${delay.lateMinutes} minutes` : undefined}
      onPointerDown={(event) => {
        startX.current = event.clientX;
        longPress.current = window.setTimeout(onPreview, 650);
      }}
      onPointerUp={(event) => {
        clearLongPress();
        const dx = event.clientX - startX.current;
        if (Math.abs(dx) < 80) return;
        if (dx > 0 && next) onNext(next);
        if (dx < 0 && !final) onCancel();
      }}
      onPointerCancel={clearLongPress}
    >
      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-base font-black">Order #{displayOrderNumber(order)}</p>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase", channelTone(channel))}>{channel}</span>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-600">Table {order.tableNumber} · {order.lines.length} item{order.lines.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-black text-slate-500">{delay.elapsedLabel}</span>
            <Badge variant={delayed ? "destructive" : order.status === "ready" ? "success" : "outline"}>{delayed ? "LATE" : statusLabel(order.status)}</Badge>
          </div>
        </div>

        {delayed ? <DelayWarning delay={delay} compact /> : null}

        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
          <span>Table: {order.tableNumber}</span>
          <span>Customer: {order.customerName || order.guestName || "Walk-in"}</span>
          <span>Type: {order.orderType ? readableKitchenOrderType(order.orderType) : "Dine in"}</span>
          <span className="text-right">Waiting: {ageMinutes}m</span>
          <span>Kitchen: {statusLabel(order.status)}</span>
          <span className="text-right">Payment: {paymentLabel(order.paymentStatus)}</span>
          <span>Priority: {priorityLabel(order, delay)}</span>
          <span className="text-right">Items: {order.lines.length}</span>
        </div>

        <div className="rounded-lg bg-slate-50 p-2">
          {visibleLines.map((line, index) => (
            <p key={`${line.itemId}-${index}`} className="truncate text-sm font-black text-slate-900">{line.name} x{line.quantity}</p>
          ))}
          {hiddenCount || order.lines.length > 2 ? (
            <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1 text-xs font-black text-orange-600">
              {expanded ? "Hide items" : `View items +${hiddenCount} more`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t bg-white p-3">
        {final ? (
          <Button className="col-span-2 min-h-11 min-w-0" disabled title={statusLabel(order.status)}>
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="truncate">{statusLabel(order.status)}</span>
          </Button>
        ) : order.status === "new" || order.status === "occupied" ? (
          <>
            <Button variant="outline" className="min-h-11 min-w-0 border-red-300 text-red-600" disabled={busy} onClick={onCancel} title="Reject order">
              <XCircle className="size-4 shrink-0" />
              <span className="truncate">Reject</span>
            </Button>
            <Button className="min-h-11 min-w-0 bg-orange-600 hover:bg-orange-700" disabled={busy || !next} onClick={() => next && onNext(next)} title="Accept order">
              <CheckCircle2 className="size-4 shrink-0" />
              <span className="truncate">Accept</span>
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" className="min-h-11 min-w-0" disabled={busy} onClick={() => onPrint(Boolean(order.printedCount))} title={order.printedCount ? "Reprint KOT" : "Print KOT"}>
              <Printer className="size-4 shrink-0" />
              <span className="truncate">{order.printedCount ? "Reprint" : "Print"}</span>
            </Button>
            <Button className="min-h-11 min-w-0 bg-orange-600 hover:bg-orange-700" disabled={busy || !next} onClick={() => next && onNext(next)} title={label}>
              <UtensilsCrossed className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function KitchenConfirmDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      returnFocusRef.current?.focus();
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="kitchen-confirm-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <h2 id="kitchen-confirm-title" className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">{description}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button ref={cancelRef} variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={() => void onConfirm()}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

function KitchenOrderCard({ order, now, busy, highlighted, onNext, onPrint, onPreview, onOpen, onCancel }: { order: TableOrder; now: number; busy: boolean; highlighted?: boolean; onNext: (status: TableOrderStatus) => void; onPrint: (reprint: boolean) => void; onPreview: () => void; onOpen: () => void; onCancel: () => void }) {
  const createdMs = Date.parse(order.createdAt);
  const ageMinutes = Number.isFinite(createdMs) ? Math.max(0, Math.round((now - createdMs) / 60000)) : 0;
  const delay = getKitchenDelay(order, now);
  const delayed = delay.delayed;
  const next = nextStatus[order.status];
  const label = actionLabel[order.status] ?? readyActionLabel(order);
  const final = isCompleted(order.status);
  return (
    <Card className={cn("cursor-pointer border-slate-200 shadow-sm", order.priority === "rush" && "border-red-300", delayed && "border-red-400 bg-red-50/40 kitchen-delay-pulse", delay.priority === "critical" && "ring-2 ring-red-300", highlighted && "ring-2 ring-orange-400")} onClick={onOpen}>
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-2xl font-black text-slate-950">Order #{displayOrderNumber(order)}</p>
            <p className="mt-1 text-sm font-black text-slate-600">{order.tableNumber} · {order.lines.length} item{order.lines.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline">{order.orderType?.toUpperCase() ?? "DINE-IN"}</Badge>
            <Badge variant={delay.priority === "critical" || delay.priority === "high" ? "destructive" : delayed ? "warning" : "secondary"}>{priorityLabel(order, delay)}</Badge>
          </div>
        </div>
        {delayed ? <DelayWarning delay={delay} /> : null}
        <div className="grid gap-1 text-xs font-bold text-slate-600">
          <span>Customer: {order.customerName || order.guestName || "Walk-in"}</span>
          <span>ETA {order.etaMinutes}m · {ageMinutes}m waiting</span>
          <span>{delay.elapsedLabel}</span>
          <span>Staff: {order.assignedStaffName || order.waiterName || "Unassigned"}</span>
          <span>Station: {order.kitchenStation || stationForOrder(order)}</span>
          <span>Payment: {paymentLabel(order.paymentStatus)}</span>
        </div>
        <div className="space-y-2">
          {order.lines.map((line, index) => (
            <div key={`${line.itemId}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-black text-slate-950">{line.quantity}x {line.name}</p>
              {line.modifiers?.length ? <p className="mt-1 text-xs font-bold text-orange-600">{line.modifiers.join(", ")}</p> : null}
              {line.notes ? <p className="mt-1 text-xs font-semibold text-slate-600">Note: {line.notes}</p> : null}
              {line.allergyNote ? <p className="mt-1 text-xs font-black text-red-600">Allergy: {line.allergyNote}</p> : null}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[44px_44px_minmax(0,1fr)_44px] gap-2" role="group" aria-label={`Kitchen actions for ${order.tableNumber}`}>
          <Button variant="outline" className="h-11 w-11 p-0" onClick={(event) => { event.stopPropagation(); onPreview(); }} title="Preview KOT" aria-label={`Preview KOT for ${order.tableNumber}`}>
            <Eye className="size-4" />
            <span className="sr-only">Preview KOT</span>
          </Button>
          <Button variant="outline" className="h-11 w-11 p-0" onClick={(event) => { event.stopPropagation(); onPrint(Boolean(order.printedCount)); }} title={order.printedCount ? "Reprint KOT" : "Print KOT"} aria-label={`${order.printedCount ? "Reprint" : "Print"} KOT for ${order.tableNumber}`}>
            <Printer className="size-4" />
            <span className="sr-only">{order.printedCount ? "Reprint KOT" : "Print KOT"}</span>
          </Button>
          {final ? (
            <Button className="col-span-2 h-11 min-w-0" disabled title={statusLabel(order.status)}>
              <CheckCircle2 className="size-4 shrink-0" />
              <span className="truncate">{statusLabel(order.status)}</span>
            </Button>
          ) : (
            <>
              <Button className="h-11 min-w-0" disabled={busy || !next} onClick={(event) => { event.stopPropagation(); if (next) onNext(next); }} title={label} aria-label={`${label} ${order.tableNumber}`}>
                <UtensilsCrossed className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Button>
              <Button variant="outline" className="h-11 w-11 p-0 text-red-600" disabled={busy} onClick={(event) => { event.stopPropagation(); onCancel(); }} title="Cancel ticket" aria-label={`Cancel kitchen ticket ${order.tableNumber}`}>
                <XCircle className="size-4" />
                <span className="sr-only">Cancel ticket</span>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KitchenOrderDrawer({ order, now, onClose, onPrint, onPreview, onNext }: { order: TableOrder; now: number; onClose: () => void; onPrint: () => void; onPreview: () => void; onNext: (status: TableOrderStatus) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const next = nextStatus[order.status];
  const delay = getKitchenDelay(order, now);
  const timeline = order.statusHistory ?? [];

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/30" role="presentation" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={`Order ${displayOrderNumber(order)} details`} className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-white p-4">
          <div>
            <p className="text-xs font-black uppercase text-orange-600">Kitchen ticket</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Order #{displayOrderNumber(order)}</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">{order.tableNumber} · {order.customerName || order.guestName || "Walk-in"} · {paymentLabel(order.paymentStatus)}</p>
          </div>
          <Button ref={closeRef} variant="ghost" size="icon" onClick={onClose} aria-label="Close order details"><XCircle className="size-5" /></Button>
        </header>
        <div className="space-y-4 p-4">
          {delay.delayed ? <DelayWarning delay={delay} /> : null}
          <section className="grid grid-cols-2 gap-2 text-sm font-bold text-slate-600">
            <InfoTile label="Status" value={statusLabel(order.status)} />
            <InfoTile label="Priority" value={priorityLabel(order, delay)} />
            <InfoTile label="ETA" value={`${order.etaMinutes} min`} />
            <InfoTile label="Source" value={order.source} />
            <InfoTile label="Staff" value={order.assignedStaffName || order.waiterName || "Unassigned"} />
            <InfoTile label="Total" value={typeof order.total === "number" ? `₹${order.total}` : "Pending"} />
          </section>
          <section className="rounded-lg border p-3">
            <h3 className="text-sm font-black uppercase text-slate-700">Items</h3>
            <div className="mt-3 space-y-2">
              {order.lines.map((line, index) => (
                <div key={`${line.itemId}-${index}`} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-black text-slate-950">{line.quantity}x {line.name}</p>
                  {line.modifiers?.length ? <p className="mt-1 text-xs font-bold text-orange-600">{line.modifiers.join(", ")}</p> : null}
                  {line.notes ? <p className="mt-1 text-xs font-semibold text-slate-600">Note: {line.notes}</p> : null}
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border p-3">
            <h3 className="text-sm font-black uppercase text-slate-700">Timeline</h3>
            <div className="mt-3 space-y-2">
              <TimelineRow label="Created" value={timeOnly(order.createdAt)} />
              {timeline.slice(-8).map((entry, index) => (
                <TimelineRow key={`${entry.event || entry.status || index}-${entry.at}`} label={statusLabel((entry.status || entry.foodStatus || "completed") as TableOrderStatus)} value={entry.at ? timeOnly(entry.at) : "Recorded"} />
              ))}
              {!timeline.length ? <p className="text-sm font-semibold text-slate-500">No additional timeline entries.</p> : null}
            </div>
          </section>
          <section className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={onPreview}><Eye className="size-4" />Preview</Button>
            <Button variant="outline" onClick={onPrint}><Printer className="size-4" />{order.printedCount ? "Reprint" : "Print"}</Button>
            <Button disabled={!next || isCompleted(order.status)} onClick={() => next && onNext(next)}><CheckCircle2 className="size-4" />{actionLabel[order.status] ?? readyActionLabel(order)}</Button>
          </section>
        </div>
      </aside>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span className="font-black text-slate-700">{label}</span>
      <span className="font-semibold text-slate-500">{value}</span>
    </div>
  );
}

function DelayWarning({ delay, compact }: { delay: DelayState; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-black text-red-700", compact ? "text-xs" : "text-sm")} role="status" aria-live="polite">
      <AlertTriangle className="size-4 shrink-0" />
      <span>DELAYED · {delay.lateMinutes} min over ETA · Immediate attention required</span>
    </div>
  );
}

function PrintPanel({ orders, onReprint }: { orders: TableOrder[]; onReprint: (order: TableOrder) => void }) {
  const printed = orders.filter((order) => order.printedCount);
  return (
    <Card><CardContent className="p-4">
      <h3 className="font-black text-slate-950">Recent KOT Prints</h3>
      <div className="mt-4 space-y-2">
        {printed.slice(0, 4).map((order) => (
          <div key={order.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span className="font-black">#{displayOrderNumber(order)}</span>
            <span className="text-slate-500">{order.tableNumber}</span>
            <Button variant="ghost" size="sm" onClick={() => onReprint(order)}>Reprint</Button>
          </div>
        ))}
        {!printed.length ? <p className="rounded-lg border border-dashed p-5 text-center text-sm font-semibold text-slate-500">No KOT prints yet</p> : null}
      </div>
    </CardContent></Card>
  );
}

function HistoryPanel({ orders }: { orders: TableOrder[] }) {
  return (
    <Card><CardContent className="p-4">
      <h3 className="font-black text-slate-950">Order History</h3>
      <div className="mt-4 space-y-2">
        {orders.slice(0, 5).map((order) => (
          <div key={order.id} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-lg border p-3 text-sm">
            <span className="font-black">#{displayOrderNumber(order)}</span>
            <span>{order.tableNumber}</span>
            <Badge variant={order.status === "cancelled" ? "destructive" : "success"}>{statusLabel(order.status)}</Badge>
          </div>
        ))}
        {!orders.length ? <p className="rounded-lg border border-dashed p-5 text-center text-sm font-semibold text-slate-500">No archived orders</p> : null}
      </div>
    </CardContent></Card>
  );
}

function buildKitchenStats(orders: TableOrder[], now: number, printerStatus: string, autoPrint: boolean) {
  const completedToday = orders.filter((order) => ["completed", "billed"].includes(order.status) && isToday(order.createdAt)).length;
  const active = orders.filter((order) => !isCompleted(order.status));
  const delays = active.map((order) => getKitchenDelay(order, now));
  const delayed = delays.filter((delay) => delay.delayed).length;
  const completed = orders.filter((order) => ["completed", "billed"].includes(order.status));
  const onTime = completed.filter((order) => {
    const createdMs = Date.parse(order.createdAt);
    return Number.isFinite(createdMs) && createdMs + order.etaMinutes * 60000 >= now;
  }).length;
  return {
    newOrders: orders.filter((order) => ["new", "occupied"].includes(order.status)).length,
    accepted: orders.filter((order) => order.status === "accepted").length,
    preparing: orders.filter((order) => order.status === "preparing").length,
    ready: orders.filter((order) => order.status === "ready").length,
    completedToday,
    averagePrep: active.length ? Math.round(delays.reduce((sum, delay) => sum + delay.elapsedMinutes, 0) / active.length) : 0,
    delayed,
    priority: delays.filter((delay) => delay.priority === "high" || delay.priority === "critical").length,
    critical: delays.filter((delay) => delay.priority === "critical").length,
    efficiency: completed.length ? Math.round((onTime / completed.length) * 100) : active.length ? Math.max(0, 100 - delayed * 10) : 100,
    printerOnline: printerStatus !== "offline",
    printerLabel: autoPrint ? "Auto" : printerStatus === "browser-preview" ? "Browser" : printerStatus,
  };
}

function filterKitchenOrders(
  orders: TableOrder[],
  filters: {
    query: string;
    source: TableOrder["source"] | "all";
    priority: TableOrder["priority"] | "all";
    status: TableOrderStatus | "all";
    table: string;
    station: string;
    staff?: string;
    orderType?: CompactOrderTypeFilter;
  },
) {
  const search = filters.query.trim().toLowerCase();
  return orders.filter((order) => {
    const station = order.kitchenStation || stationForOrder(order);
    const staff = order.assignedStaffName || order.waiterName || "";
    const matchesSearch = !search || [
      displayOrderNumber(order),
      order.id,
      order.tableNumber,
      order.customerName,
      order.guestName,
      order.waiterName,
      station,
      order.source,
      order.orderType,
      ...order.lines.map((line) => line.name),
    ].filter(Boolean).join(" ").toLowerCase().includes(search);
    return matchesSearch
      && (filters.source === "all" || order.source === filters.source)
      && (filters.priority === "all" || order.priority === filters.priority)
      && (filters.status === "all" || order.status === filters.status)
      && (filters.table === "all" || order.tableNumber === filters.table)
      && (filters.station === "all" || station === filters.station)
      && (!filters.staff || filters.staff === "all" || staff === filters.staff)
      && (!filters.orderType || filters.orderType === "all" || order.orderType === filters.orderType);
  });
}

async function readKitchenPayload<T>(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || fallback);
  return payload;
}

function openKitchenTicket(order: TableOrder, printer: PrinterProfile | undefined, options: { print: boolean }) {
  const content = [
    "*** KOT ***",
    "Cafe Al Arab UL",
    `Order: ${displayOrderNumber(order)}`,
    `Date: ${new Date().toLocaleString("en-IN")}`,
    `Table: ${order.tableNumber}`,
    `Type: ${order.orderType ?? "dine-in"}`,
    "------------------------",
    ...order.lines.flatMap((line) => [
      `${line.quantity} x ${line.name}`,
      ...(line.modifiers?.length ? [`  ${line.modifiers.join(", ")}`] : []),
      ...(line.notes ? [`  Note: ${line.notes}`] : []),
      ...(line.allergyNote ? [`  Allergy: ${line.allergyNote}`] : []),
    ]),
    "------------------------",
    "KITCHEN COPY",
  ].join("\n");
  const win = window.open("", "kot-print", "width=420,height=640");
  if (!win) return false;
  win.document.write(`<pre style="font: 13px monospace; white-space: pre-wrap; width: ${printer?.paperWidth === "58mm" ? "220px" : "300px"}">${escapeHtml(content)}</pre>`);
  win.document.close();
  win.focus();
  if (options.print) win.print();
  return true;
}

function sortKitchenOrders(a: TableOrder, b: TableOrder, now = Date.now()) {
  const firstRank = delaySortRank(a, now);
  const secondRank = delaySortRank(b, now);
  const priority = secondRank.criticality - firstRank.criticality;
  const late = secondRank.lateMinutes - firstRank.lateMinutes;
  const first = Date.parse(a.createdAt);
  const second = Date.parse(b.createdAt);
  const oldest = (Number.isFinite(first) ? first : 0) - (Number.isFinite(second) ? second : 0);
  return priority || late || oldest || firstRank.etaMinutes - secondRank.etaMinutes;
}

function isVisibleOnBoard(order: TableOrder) {
  return !isCompleted(order.status) || isToday(order.createdAt);
}

function isCompleted(status: TableOrderStatus) {
  return ["completed", "cancelled", "billed"].includes(status);
}

function isToday(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function matchesDateRange(value: string, range: "today" | "yesterday" | "7d" | "month" | "all") {
  if (range === "all") return true;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (range === "today") return date >= start;
  if (range === "yesterday") {
    const yesterday = new Date(start);
    yesterday.setDate(yesterday.getDate() - 1);
    return date >= yesterday && date < start;
  }
  if (range === "7d") {
    const week = new Date(start);
    week.setDate(week.getDate() - 6);
    return date >= week;
  }
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function readyActionLabel(order: TableOrder) {
  if (order.orderType === "delivery") return "Hand to Rider";
  if (order.orderType === "parcel" || order.orderType === "takeaway") return "Collected";
  return "Serve";
}

function isStringValue(value: string | undefined): value is string {
  return Boolean(value);
}

function stationForOrder(order: TableOrder) {
  if (order.orderType === "delivery") return "Dispatch";
  if (order.lines.some((line) => /juice|tea|coffee|drink/i.test(line.name))) return "Beverage";
  return "Main Kitchen";
}

function priorityLabel(order: TableOrder, delay: DelayState) {
  if (delay.priority === "critical") return "Critical";
  if (delay.priority === "high" || order.priority === "rush") return "High";
  if (delay.priority === "medium") return "Medium";
  return "Normal";
}

function kitchenActionToast(order: TableOrder, status: TableOrderStatus) {
  if (status === "accepted") return "Order accepted.";
  if (status === "preparing") return "Cooking started.";
  if (status === "ready") return "Order ready.";
  if (status === "served") return readyActionLabel(order) === "Collected" ? "Parcel completed." : "Order served.";
  if (status === "completed") return `${readyActionLabel(order) === "Collected" ? "Parcel" : "Order"} moved to Completed.`;
  if (status === "cancelled") return "Order cancelled.";
  return `${order.tableNumber} moved to ${statusLabel(status)}.`;
}

function paymentLabel(value?: PaymentState | TableOrder["paymentStatus"]) {
  if (value === "paid") return "PAID";
  if (value === "refunded") return "REFUNDED";
  if (value === "partial" || value === "authorized") return "PARTIAL";
  return "UNPAID";
}

function displayOrderNumber(order: TableOrder) {
  const extended = order as KitchenDisplayOrder;
  const explicit = extended.orderNumber ?? extended.displayOrderNumber ?? extended.invoiceNumber ?? extended.billNumber;
  if (explicit) return String(explicit).replace(/^INV[-_]?/i, "").slice(-8);
  const digits = order.id.replace(/\D/g, "");
  if (digits) return digits.slice(-4).padStart(4, "0");
  return order.id.slice(-4).toUpperCase().padStart(4, "0");
}

function readableKitchenOrderType(type: NonNullable<TableOrder["orderType"]>) {
  if (type === "dine-in") return "Dine in";
  if (type === "takeaway") return "Takeaway";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function channelTone(channel: string) {
  const key = channel.toLowerCase();
  if (key.includes("qr")) return "bg-emerald-50 text-emerald-700";
  if (key.includes("waiter")) return "bg-blue-50 text-blue-700";
  if (key.includes("delivery")) return "bg-violet-50 text-violet-700";
  if (key.includes("parcel") || key.includes("takeaway")) return "bg-amber-50 text-amber-700";
  if (key.includes("web") || key.includes("online")) return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-700";
}

function statusLabel(status: TableOrderStatus) {
  if (status === "new" || status === "occupied") return "New";
  if (status === "accepted") return "Accepted";
  if (status === "preparing") return "Preparing";
  if (status === "ready") return "Ready";
  if (status === "served") return "Served";
  if (status === "cancelled") return "Cancelled";
  if (status === "billed") return "Billed";
  return "Completed";
}

function timeOnly(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--";
}

function iconTone(tone: string) {
  const tones: Record<string, string> = {
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return tones[tone] ?? tones.slate;
}

function compactTabTone(tone: string) {
  if (tone === "red") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "orange") return "border-orange-200 bg-orange-50 text-orange-700";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-300 bg-slate-100 text-slate-700";
}

function compactTextTone(tone: string) {
  if (tone === "red") return "text-red-600";
  if (tone === "orange") return "text-orange-600";
  if (tone === "amber") return "text-amber-600";
  if (tone === "green") return "text-emerald-600";
  return "text-slate-700";
}

function compactTitleColor(tone: string) {
  if (tone === "red") return "#dc2626";
  if (tone === "orange" || tone === "amber") return "#ea580c";
  if (tone === "green") return "#059669";
  return "#475569";
}

function columnBorder(tone: string) {
  if (tone === "red") return "border-red-200";
  if (tone === "orange") return "border-orange-200";
  if (tone === "amber") return "border-amber-200";
  if (tone === "green") return "border-emerald-200";
  return "border-slate-200";
}

function columnHeader(tone: string) {
  if (tone === "red") return "bg-red-50 text-red-700";
  if (tone === "orange") return "bg-orange-50 text-orange-700";
  if (tone === "amber") return "bg-amber-50 text-amber-700";
  if (tone === "green") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-50 text-slate-700";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function playReadyTone() {
  const audio = new Audio("data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YRAAAAAAAP//AAD//wAA//8AAP//AAA=");
  void audio.play().catch(() => undefined);
}
