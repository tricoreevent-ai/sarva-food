"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock,
  Filter,
  Maximize2,
  Printer,
  Settings2,
  Timer,
  UtensilsCrossed,
  Volume2,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePrinterSettings } from "@/hooks/use-printer-settings";
import { cn } from "@/lib/utils";
import type { PosTable, PrinterProfile, TableOrder, TableOrderStatus } from "@/lib/types";

type KitchenColumnId = "new" | "accepted" | "preparing" | "ready" | "completed";
type PaymentState = "unpaid" | "partial" | "paid" | "refunded";

const columns: Array<{ id: KitchenColumnId; title: string; tone: string; statuses: TableOrderStatus[] }> = [
  { id: "new", title: "New Orders", tone: "red", statuses: ["new", "occupied"] },
  { id: "accepted", title: "Accepted", tone: "orange", statuses: ["accepted"] },
  { id: "preparing", title: "Preparing", tone: "amber", statuses: ["preparing"] },
  { id: "ready", title: "Ready for Service", tone: "green", statuses: ["ready"] },
  { id: "completed", title: "Completed", tone: "slate", statuses: ["served", "completed", "billed"] },
];

const nextStatus: Partial<Record<TableOrderStatus, TableOrderStatus>> = {
  new: "accepted",
  occupied: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
};

const actionLabel: Partial<Record<TableOrderStatus, string>> = {
  new: "Accept",
  occupied: "Accept",
  accepted: "Start Cooking",
  preparing: "Ready",
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
  const busyOrders = useRef(new Set<string>());
  const printedThisSession = useRef(new Set<string>());
  const previousNewOrders = useRef(new Set<string>());
  const { settings, save: savePrinterSettings, log: logPrint } = usePrinterSettings();

  const kitchenPrinters = useMemo(
    () => (settings.profiles ?? []).filter((profile) => profile.type === "kitchen"),
    [settings.profiles],
  );
  const selectedPrinter = kitchenPrinters.find((profile) => profile.id === selectedPrinterId) ?? kitchenPrinters[0];
  const visibleOrders = useMemo(() => orders.filter(isVisibleOnBoard).sort(sortKitchenOrders), [orders]);
  const activeRequests = useMemo(() => tables.flatMap((table) => (table.serviceRequests ?? []).filter((request) => request.status === "open").map((request) => ({ ...request, table: table.table }))).slice(-8).reverse(), [tables]);
  const historyOrders = useMemo(() => orders.filter((order) => isCompleted(order.status) && !isToday(order.createdAt)), [orders]);
  const stats = useMemo(() => buildKitchenStats(visibleOrders, now, settings.connectionStatus, settings.autoPrintOrders), [now, settings.autoPrintOrders, settings.connectionStatus, visibleOrders]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/owner/kitchen", { cache: "no-store" }).then((response) => response.json()) as Promise<{ data?: TableOrder[] }>,
      fetch("/api/owner/tables", { cache: "no-store" }).then((response) => response.json()) as Promise<{ data?: PosTable[] }>,
    ])
      .then(([payload, tablePayload]) => {
        if (!active) return;
        setOrders(payload.data ?? []);
        setTables(tablePayload.data ?? []);
        setConnectionState("fallback");
      })
      .catch(() => {
        if (active) setConnectionState("error");
      });
    const events = new EventSource("/api/owner/kitchen/stream");
    events.addEventListener("orders", (event) => {
      if (!active) return;
      const payload = JSON.parse((event as MessageEvent).data) as { data?: TableOrder[] };
      setOrders(payload.data ?? []);
      setConnectionState("realtime");
    });
    events.addEventListener("error", () => {
      if (active) setConnectionState((current) => current === "realtime" ? current : "error");
    });
    return () => {
      active = false;
      events.close();
    };
  }, []);

  const updateStatus = useCallback(async (order: TableOrder, status: TableOrderStatus) => {
    if (busyOrders.current.has(order.id)) return;
    busyOrders.current.add(order.id);
    setBusyOrderId(order.id);
    const previous = orders;
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    try {
      const response = await fetch("/api/owner/kitchen", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.id, status }),
      });
      if (!response.ok) {
        setOrders(previous);
        setConnectionState("error");
      }
    } catch {
      setOrders(previous);
      setConnectionState("error");
    } finally {
      busyOrders.current.delete(order.id);
      setBusyOrderId(null);
    }
  }, [orders]);

  const printKot = useCallback(async (order: TableOrder, options: { auto?: boolean; reprint?: boolean } = {}) => {
    const jobId = `${order.id}:${options.reprint ? "reprint" : "print"}`;
    if (!options.reprint && printedThisSession.current.has(jobId)) return;
    printedThisSession.current.add(jobId);
    const printed = printKitchenTicket(order, selectedPrinter);
    if (!printed) {
      printedThisSession.current.delete(jobId);
      return;
    }
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
    if (soundAlerts && options.auto) playReadyTone();
  }, [logPrint, selectedPrinter, soundAlerts]);

  useEffect(() => {
    if (!settings.autoPrintOrders) return;
    const nextNewOrders = new Set(visibleOrders.filter((order) => ["new", "occupied"].includes(order.status)).map((order) => order.id));
    visibleOrders
      .filter((order) => nextNewOrders.has(order.id) && !previousNewOrders.current.has(order.id))
      .forEach((order) => {
        if (!printedThisSession.current.has(`${order.id}:print`) && !order.printedCount) {
          void printKot(order, { auto: true });
        }
      });
    previousNewOrders.current = nextNewOrders;
  }, [printKot, settings.autoPrintOrders, visibleOrders]);

  async function toggleAutoPrint() {
    await savePrinterSettings({ ...settings, autoPrintOrders: !settings.autoPrintOrders });
  }

  return (
    <div className={cn(fullscreen ? "fixed inset-0 z-50 overflow-auto bg-slate-50 p-4" : "space-y-5", "kitchen-ops-center")}>
      <SectionHeader
        title="Kitchen Operations Center"
        description="Manage and track kitchen orders in real time."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" title="Filter kitchen orders"><Filter className="size-4" />Filters</Button>
            <Button variant="outline" title="Kitchen settings"><Settings2 className="size-4" />Kitchen Settings</Button>
            <Button variant={settings.autoPrintOrders ? "default" : "outline"} onClick={toggleAutoPrint} title="Toggle automatic KOT printing">
              <Printer className="size-4" />Auto Print KOT {settings.autoPrintOrders ? "ON" : "OFF"}
            </Button>
            <Button variant="outline" onClick={() => setFullscreen((value) => !value)} title="Toggle kitchen full screen"><Maximize2 className="size-4" />{fullscreen ? "Exit" : "Full screen"}</Button>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-10">
        <KitchenMetric label="New Orders" value={stats.newOrders} tone="red" />
        <KitchenMetric label="Accepted" value={stats.accepted} tone="orange" />
        <KitchenMetric label="Preparing" value={stats.preparing} tone="amber" />
        <KitchenMetric label="Ready" value={stats.ready} tone="green" />
        <KitchenMetric label="Completed Today" value={stats.completedToday} tone="blue" />
        <KitchenMetric label="Avg. Prep Time" value={`${stats.averagePrep}m`} tone="violet" />
        <KitchenMetric label="Delayed" value={stats.delayed} tone="red" />
        <KitchenMetric label="High Priority" value={stats.priority} tone="orange" />
        <KitchenMetric label="Efficiency" value={`${stats.efficiency}%`} tone="green" />
        <KitchenMetric label="Printer" value={stats.printerLabel} tone={stats.printerOnline ? "green" : "slate"} compact />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connectionState === "realtime" ? "success" : connectionState === "error" ? "warning" : "muted"}>
            {connectionState === "realtime" ? "Realtime Firestore" : connectionState === "fallback" ? "API Snapshot" : connectionState === "error" ? "Sync error" : "Loading"}
          </Badge>
          <Badge variant={settings.autoPrintOrders ? "success" : "muted"}>Auto Refresh ON</Badge>
          <Button variant="ghost" onClick={() => setSoundAlerts((value) => !value)} title="Toggle sound alerts">
            <Volume2 className="size-4" />Sound {soundAlerts ? "ON" : "OFF"}
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
          Printer
          <select className="h-10 rounded-lg border bg-white px-3 text-sm" value={selectedPrinter?.id ?? selectedPrinterId} onChange={(event) => setSelectedPrinterId(event.target.value)}>
            {(kitchenPrinters.length ? kitchenPrinters : [{ id: "browser-kitchen", name: "Browser print", paperWidth: "80mm" } as PrinterProfile]).map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name} ({profile.paperWidth})</option>
            ))}
          </select>
        </label>
      </section>

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

      <section className="overflow-x-auto pb-2">
        <div className="grid min-w-[1280px] grid-cols-5 gap-4">
          {columns.map((column) => {
            const columnOrders = visibleOrders.filter((order) => column.statuses.includes(order.status));
            return (
              <div key={column.id} className={cn("max-h-[calc(100vh-330px)] overflow-y-auto rounded-xl border bg-white shadow-sm", columnBorder(column.tone))}>
                <div className={cn("sticky top-0 z-10 flex items-center justify-between border-b px-3 py-3", columnHeader(column.tone))}>
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
                      onPrint={(reprint) => void printKot(order, { reprint })}
                      onNext={(status) => void updateStatus(order, status)}
                    />
                  ))}
                  {!columnOrders.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm font-semibold text-slate-500">No orders</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
        <InfoPanel title="Order Timeline" orders={visibleOrders.slice(0, 1)} />
        <PrintPanel orders={visibleOrders} onReprint={(order) => void printKot(order, { reprint: true })} />
        <HistoryPanel orders={historyOrders} />
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white">
        <span>Priority Guide: High (Urgent) · Medium (Delayed) · Low (Normal)</span>
        <span className="flex gap-4"><span>Auto KOT: {settings.autoPrintOrders ? "ON" : "OFF"}</span><span>Sound Alerts: {soundAlerts ? "ON" : "OFF"}</span></span>
      </footer>
    </div>
  );
}

function KitchenMetric({ label, value, tone, compact }: { label: string; value: string | number; tone: "red" | "orange" | "amber" | "green" | "blue" | "violet" | "slate"; compact?: boolean }) {
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="flex h-20 items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-500">{label}</p>
          <p className={cn("mt-1 font-black text-slate-950", compact ? "truncate text-sm" : "text-2xl")}>{value}</p>
        </div>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", iconTone(tone))}>
          {tone === "red" ? <BellRing className="size-4" /> : tone === "amber" || tone === "orange" ? <Timer className="size-4" /> : <CheckCircle2 className="size-4" />}
        </span>
      </CardContent>
    </Card>
  );
}

function KitchenOrderCard({ order, now, busy, onNext, onPrint }: { order: TableOrder; now: number; busy: boolean; onNext: (status: TableOrderStatus) => void; onPrint: (reprint: boolean) => void }) {
  const ageMinutes = Math.max(1, Math.round((now - Date.parse(order.createdAt)) / 60000));
  const delayed = ageMinutes > order.etaMinutes && !isCompleted(order.status);
  const next = nextStatus[order.status];
  const label = actionLabel[order.status] ?? readyActionLabel(order);
  return (
    <Card className={cn("border-slate-200 shadow-sm", order.priority === "rush" && "border-red-300", delayed && "bg-red-50/40")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">#{order.id}</p>
            <p className="mt-1 text-lg font-black text-slate-950">{order.tableNumber}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline">{order.orderType?.toUpperCase() ?? "DINE-IN"}</Badge>
            <Badge variant={order.priority === "rush" ? "destructive" : delayed ? "warning" : "secondary"}>{priorityLabel(order, delayed)}</Badge>
          </div>
        </div>
        <div className="grid gap-1 text-xs font-bold text-slate-600">
          <span>Customer: {order.customerName || order.guestName || "Walk-in"}</span>
          <span>ETA {order.etaMinutes}m · {ageMinutes}m since order</span>
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
        <div className="flex gap-2">
          <Button variant="outline" className="shrink-0" onClick={() => onPrint(Boolean(order.printedCount))}>
            <Printer className="size-4" />{order.printedCount ? "Reprint KOT" : "Print KOT"}
          </Button>
          {isCompleted(order.status) ? (
            <Button className="flex-1" disabled><CheckCircle2 className="size-4" />Completed</Button>
          ) : (
            <Button className="flex-1" disabled={busy || !next} onClick={() => next && onNext(next)}>
              <UtensilsCrossed className="size-4" />{label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoPanel({ title, orders }: { title: string; orders: TableOrder[] }) {
  const order = orders[0];
  return (
    <Card><CardContent className="p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      {order ? (
        <div className="mt-4 space-y-3 text-sm">
          {["Created", "Accepted", "Preparing", "Ready", "Served", "Paid", "Completed"].map((stage, index) => (
            <div key={stage} className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold text-slate-700"><Clock className={cn("size-4", index <= 2 ? "text-orange-500" : "text-slate-300")} />{stage}</span>
              <span className="text-xs text-slate-500">{index === 0 ? timeOnly(order.createdAt) : "Pending"}</span>
            </div>
          ))}
        </div>
      ) : <p className="mt-4 text-sm font-semibold text-slate-500">No active timeline</p>}
    </CardContent></Card>
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
            <span className="font-black">#{order.id}</span>
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
            <span className="font-black">#{order.id}</span>
            <span>{order.tableNumber}</span>
            <Badge variant="success">Completed</Badge>
          </div>
        ))}
        {!orders.length ? <p className="rounded-lg border border-dashed p-5 text-center text-sm font-semibold text-slate-500">No archived orders</p> : null}
      </div>
    </CardContent></Card>
  );
}

function buildKitchenStats(orders: TableOrder[], now: number, printerStatus: string, autoPrint: boolean) {
  const completedToday = orders.filter((order) => isCompleted(order.status) && isToday(order.createdAt)).length;
  const active = orders.filter((order) => !isCompleted(order.status));
  const delayed = active.filter((order) => now - Date.parse(order.createdAt) > order.etaMinutes * 60000).length;
  const completed = orders.filter((order) => isCompleted(order.status));
  const onTime = completed.filter((order) => Date.parse(order.createdAt) + order.etaMinutes * 60000 >= now).length;
  return {
    newOrders: orders.filter((order) => ["new", "occupied"].includes(order.status)).length,
    accepted: orders.filter((order) => order.status === "accepted").length,
    preparing: orders.filter((order) => order.status === "preparing").length,
    ready: orders.filter((order) => order.status === "ready").length,
    completedToday,
    averagePrep: orders.length ? Math.round(orders.reduce((sum, order) => sum + order.etaMinutes, 0) / orders.length) : 0,
    delayed,
    priority: active.filter((order) => order.priority === "rush").length,
    efficiency: completed.length ? Math.round((onTime / completed.length) * 100) : active.length ? Math.max(0, 100 - delayed * 10) : 100,
    printerOnline: printerStatus !== "offline",
    printerLabel: autoPrint ? "Auto" : printerStatus === "browser-preview" ? "Browser" : printerStatus,
  };
}

function printKitchenTicket(order: TableOrder, printer?: PrinterProfile) {
  const content = [
    "*** KOT ***",
    "Cafe Al Arab UL",
    `Order: ${order.id}`,
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
  win.print();
  return true;
}

function sortKitchenOrders(a: TableOrder, b: TableOrder) {
  const priority = (b.priority === "rush" ? 1 : 0) - (a.priority === "rush" ? 1 : 0);
  return priority || Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

function isVisibleOnBoard(order: TableOrder) {
  return !isCompleted(order.status) || isToday(order.createdAt);
}

function isCompleted(status: TableOrderStatus) {
  return ["served", "completed", "billed"].includes(status);
}

function isToday(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function readyActionLabel(order: TableOrder) {
  if (order.orderType === "delivery") return "Hand to Rider";
  if (order.orderType === "parcel" || order.orderType === "takeaway") return "Collected";
  return "Serve";
}

function stationForOrder(order: TableOrder) {
  if (order.orderType === "delivery") return "Dispatch";
  if (order.lines.some((line) => /juice|tea|coffee|drink/i.test(line.name))) return "Beverage";
  return "Main Kitchen";
}

function priorityLabel(order: TableOrder, delayed: boolean) {
  if (order.priority === "rush") return "High";
  if (delayed) return "Medium";
  return "Low";
}

function paymentLabel(value?: PaymentState | TableOrder["paymentStatus"]) {
  if (value === "paid") return "PAID";
  if (value === "refunded") return "REFUNDED";
  if (value === "partial" || value === "authorized") return "PARTIAL";
  return "UNPAID";
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
