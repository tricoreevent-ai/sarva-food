"use client";

import Link from "next/link";
import Image from "next/image";
import type { ElementType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { toast } from "@/lib/client-toast";
import { ArrowRightLeft, Ban, Brush, CalendarCheck, CheckCircle2, CircleX, Clock3, Copy, Download, Edit3, ExternalLink, Grid2X2, History, LayoutGrid, List, Plus, Printer, QrCode, ReceiptText, RefreshCcw, Search, Settings2, Smartphone, Table2, TimerReset, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PosTable, TableOrder } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/lib/app-store";

type DisplayStatus = "Available" | "Occupied" | "Reserved" | "Cleaning" | "Inactive";
type TableDraft = {
  id?: string;
  name: string;
  table: string;
  seats: string;
  floor: string;
  section: string;
  description: string;
  active: boolean;
  dineInEnabled: boolean;
  qrOrderingEnabled: boolean;
};

const statusTone: Record<DisplayStatus, string> = {
  Available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Occupied: "border-orange-200 bg-orange-50 text-orange-700",
  Reserved: "border-violet-200 bg-violet-50 text-violet-700",
  Cleaning: "border-amber-200 bg-amber-50 text-amber-700",
  Inactive: "border-slate-200 bg-slate-50 text-slate-500",
};

export function RestaurantTablesFlow() {
  const authUser = useAppStore((state) => state.authUser);
  const ownerBusinessProfile = useAppStore((state) => state.ownerBusinessProfile);
  const restaurants = useAppStore((state) => state.restaurants);
  const [configuredTables, setConfiguredTables] = useState<PosTable[]>([]);
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [selectedTableId, setSelectedTable] = useState("");
  const [query, setQuery] = useState("");
  const [floor, setFloor] = useState("All Floors");
  const [status, setStatus] = useState<DisplayStatus | "All Status">("All Status");
  const [showInactive, setShowInactive] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [draft, setDraft] = useState<TableDraft | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const loadTables = useCallback(async (signal?: AbortSignal) => {
    await Promise.all([
      fetch("/api/owner/tables", { cache: "no-store", signal }).then((response) => readTablesPayload<{ data?: PosTable[] }>(response, "Tables could not be loaded.")),
      fetch("/api/owner/kitchen", { cache: "no-store", signal }).then((response) => readTablesPayload<{ data?: TableOrder[] }>(response, "Kitchen orders could not be loaded.")),
    ]).then(([tables, kitchen]) => {
      setConfiguredTables(tables.data ?? []);
      setOrders(kitchen.data ?? []);
    }).catch((error) => {
      if ((error as Error).name !== "AbortError") toast.error("Table data could not be loaded.");
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTables(controller.signal);
    return () => controller.abort();
  }, [loadTables]);

  const tableRows = useMemo(() => {
    return configuredTables.slice().sort((first, second) => first.table.localeCompare(second.table, undefined, { numeric: true }));
  }, [configuredTables]);

  const selectedTable = tableRows.find((table) => table.table === selectedTableId) ?? tableRows[0];
  const restaurantName = ownerBusinessProfile?.hotelName || restaurants.find((restaurant) => restaurant.slug === authUser.restaurantSlug || restaurant.id === authUser.restaurantSlug)?.name || "Restaurant";
  const selectedActiveOrder = selectedTable ? findActiveOrder(orders, selectedTable.table) : undefined;
  const selectedStatus = selectedTable ? getDisplayStatus(selectedTable, selectedActiveOrder) : "Available";
  const deleteBlockedReason = selectedActiveOrder
    ? "This table has an active kitchen order. Complete or move the order before deleting it."
    : selectedTable?.currentSessionId && selectedTable.sessionStatus === "active"
      ? "This table has an active QR session. End or let the session expire before deleting it."
      : "";
  const filteredTables = tableRows.filter((table) => {
    const activeOrder = findActiveOrder(orders, table.table);
    const display = getDisplayStatus(table, activeOrder);
    const tableFloor = table.floor ?? inferFloor(table.table);
    const search = query.trim().toLowerCase();
    return (!search || table.table.toLowerCase().includes(search) || tableFloor.toLowerCase().includes(search))
      && (floor === "All Floors" || tableFloor === floor)
      && (status === "All Status" || display === status)
      && (showInactive || display !== "Inactive");
  });
  const grouped = groupByFloor(filteredTables);
  const qrReadyTables = filteredTables.filter((table) => table.qrUrl && table.qrOrderingEnabled !== false);
  const activeSessions = tableRows.filter(isLiveSession);
  const stats = {
    total: tableRows.length,
    available: tableRows.filter((table) => getDisplayStatus(table, findActiveOrder(orders, table.table)) === "Available").length,
    occupied: tableRows.filter((table) => getDisplayStatus(table, findActiveOrder(orders, table.table)) === "Occupied").length,
    reserved: tableRows.filter((table) => getDisplayStatus(table, findActiveOrder(orders, table.table)) === "Reserved").length,
    cleaning: tableRows.filter((table) => getDisplayStatus(table, findActiveOrder(orders, table.table)) === "Cleaning").length,
  };

  function nextTable() {
    const occupiedNumbers = orders.map((order) => Number(order.tableNumber.replace(/\D/g, "")) || 0);
    const configuredNumbers = tableRows.map((table) => Number(table.table.replace(/\D/g, "")) || 0);
    const max = Math.max(0, ...occupiedNumbers, ...configuredNumbers) + 1;
    return `T${String(max).padStart(2, "0")}`;
  }

  function addTable() {
    const table = nextTable();
    setDraft({
      name: `Table ${table.replace(/\D/g, "") || table}`,
      table,
      seats: "4",
      floor: inferFloor(table),
      section: inferFloor(table),
      description: "",
      active: true,
      dineInEnabled: true,
      qrOrderingEnabled: true,
    });
  }

  function editTable(table: PosTable) {
    setDraft({
      id: table.id,
      name: table.name || `Table ${table.table.replace(/\D/g, "") || table.table}`,
      table: table.table,
      seats: table.seats,
      floor: table.floor ?? inferFloor(table.table),
      section: table.section ?? table.floor ?? inferFloor(table.table),
      description: table.description ?? table.note ?? "",
      active: table.active !== false,
      dineInEnabled: table.dineInEnabled !== false,
      qrOrderingEnabled: table.qrOrderingEnabled !== false,
    });
  }

  function duplicateTable(table: PosTable) {
    const next = nextTable();
    setDraft({
      name: `${table.name || table.table} copy`,
      table: next,
      seats: table.seats,
      floor: table.floor ?? inferFloor(next),
      section: table.section ?? table.floor ?? inferFloor(next),
      description: table.description ?? table.note ?? "",
      active: table.active !== false,
      dineInEnabled: table.dineInEnabled !== false,
      qrOrderingEnabled: table.qrOrderingEnabled !== false,
    });
  }

  function updateSelected(patch: Partial<PosTable>) {
    if (!selectedTable) return;
    void saveTable({ ...selectedTable, ...patch }).catch((error) => toast.error(error instanceof Error ? error.message : "Table could not be updated."));
  }

  async function saveTable(table: PosTable) {
    const response = await fetch("/api/owner/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(table),
    });
    const payload = await response.json().catch(() => ({})) as { data?: PosTable; error?: string };
    if (!response.ok || !payload.data) throw new Error(payload.error || "Table could not be saved.");
    const next = payload.data ?? table;
    setConfiguredTables((current) => current.some((item) => item.table === next.table) ? current.map((item) => item.table === next.table ? next : item) : [...current, next]);
    return next;
  }

  async function saveDraft(generateQr = false) {
    if (!draft || savingDraft) return;
    const seats = Number(draft.seats);
    if (!draft.table.trim() || !draft.name.trim() || !Number.isFinite(seats) || seats < 1 || !draft.floor.trim()) {
      toast.error("Table name, display number, capacity, and floor are required.");
      return;
    }
    const duplicate = configuredTables.some((table) => table.table.toLowerCase() === draft.table.trim().toLowerCase() && table.id !== draft.id);
    if (duplicate) {
      toast.error("Display number must be unique.");
      return;
    }
    try {
      setSavingDraft(true);
      const next = await saveTable({
        id: draft.id,
        name: draft.name.trim(),
        table: draft.table.trim().toUpperCase(),
        seats: String(seats),
        status: draft.active ? "Open" : "Inactive",
        amount: "0",
        floor: draft.floor.trim(),
        section: draft.section.trim(),
        description: draft.description.trim(),
        note: draft.description.trim(),
        active: draft.active,
        dineInEnabled: draft.dineInEnabled,
        qrOrderingEnabled: generateQr ? true : draft.qrOrderingEnabled,
        generateQr,
        lastCleanedAt: new Date().toISOString(),
      } as PosTable & { generateQr?: boolean });
      if (generateQr) await validateGeneratedQr(next);
      setSelectedTable(next.table);
      setDraft(null);
      toast.success(generateQr ? "Table saved and QR generated." : "Table saved.");
    } catch (error) {
      console.error("[tables] save table failed", { table: draft.table, generateQr, error });
      toast.error(error instanceof Error ? error.message : "Table could not be saved.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function deleteTable(table: string) {
    const response = await fetch(`/api/owner/tables?table=${encodeURIComponent(table)}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      toast.error(payload.error || "Table could not be deleted.");
      return;
    }
    setConfiguredTables((current) => current.filter((item) => item.table !== table));
    setSelectedTable((current) => current === table ? "" : current);
  }

  async function tableAction(table: PosTable, action: "rotate-qr" | "enable-qr" | "disable-qr") {
    const response = await fetch("/api/owner/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: table.id, table: table.table, action }),
    });
    const payload = await response.json().catch(() => ({})) as { data?: PosTable; error?: string };
    if (!response.ok || !payload.data) {
      toast.error(payload.error || "QR action failed.");
      return;
    }
    setConfiguredTables((current) => current.map((item) => item.table === table.table ? payload.data as PosTable : item));
    toast.success(action === "rotate-qr" ? "QR regenerated." : action === "enable-qr" ? "QR enabled." : "QR disabled.");
  }

  async function sessionAction(table: PosTable, action: "extend-session" | "end-session" | "transfer-session") {
    const targetTable = action === "transfer-session" ? window.prompt("Transfer active QR session to table")?.trim().toUpperCase() : "";
    if (action === "transfer-session" && !targetTable) return;
    const response = await fetch("/api/owner/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: table.id, table: table.table, action, targetTable, minutes: 15 }),
    });
    const payload = await response.json().catch(() => ({})) as { data?: PosTable; error?: string };
    if (!response.ok) {
      toast.error(payload.error || "Session action failed.");
      return;
    }
    await loadTables();
    toast.success(action === "extend-session" ? "Session extended." : action === "transfer-session" ? "Session transferred." : "Session ended.");
  }

  async function bulkDownloadQr() {
    if (!qrReadyTables.length) return toast.error("No enabled table QR codes in the current view.");
    const items = await Promise.all(qrReadyTables.map(async (table) => ({
      table,
      png: await QRCode.toDataURL(table.qrUrl ?? "", { width: 360, margin: 1 }),
    })));
    items.forEach(({ table, png }, index) => window.setTimeout(() => downloadHref(`${safeTableName(table.table)}-qr.png`, png), index * 120));
    toast.success(`Downloading ${items.length} QR codes.`);
  }

  async function bulkPrintQr() {
    if (!qrReadyTables.length) return toast.error("No enabled table QR codes in the current view.");
    const items = await Promise.all(qrReadyTables.map(async (table) => ({
      table,
      png: await QRCode.toDataURL(table.qrUrl ?? "", { width: 280, margin: 1 }),
    })));
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return toast.error("Allow popups to print bulk QR codes.");
    win.document.write(`<title>Table QR codes</title><style>body{font-family:Arial,sans-serif;padding:24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{break-inside:avoid;text-align:center;border:1px solid #ddd;border-radius:12px;padding:14px}img{width:180px;height:180px}strong{display:block;margin-top:8px;font-size:18px}@media print{button{display:none}.grid{grid-template-columns:repeat(3,1fr)}}</style><button onclick="window.print()">Print</button><div class="grid">${items.map(({ table, png }) => `<div class="card"><img src="${png}" alt="${table.table} QR"><strong>${table.table}</strong><span>${table.name || "Table ordering"}</span></div>`).join("")}</div>`);
    win.document.close();
    win.focus();
  }

  async function changeTableTicketStatus(orderId: string, nextStatus: TableOrder["status"]) {
    const response = await fetch("/api/owner/kitchen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status: nextStatus === "billed" ? "completed" : nextStatus }),
    });
    const payload = await response.json() as { data?: TableOrder };
    setOrders((current) => current.map((order) => order.id === orderId ? payload.data ?? { ...order, status: nextStatus } : order));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-950">Table management</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Manage restaurant tables, status, and operations in real time.</p>
          </div>
          <Button onClick={addTable} className="bg-orange-600 text-white hover:bg-orange-700">
            <Plus className="size-4" />
            Add New Table
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={Table2} label="Total Tables" value={stats.total} hint="Registered tables" tone="blue" />
          <Metric icon={CheckCircle2} label="Available" value={stats.available} hint="Ready for seating" tone="green" />
          <Metric icon={Users} label="Occupied" value={stats.occupied} hint="Currently in use" tone="orange" />
          <Metric icon={CalendarCheck} label="Reserved" value={stats.reserved} hint="Reserved for guests" tone="violet" />
          <Metric icon={Brush} label="Under Cleaning" value={stats.cleaning} hint="Being cleaned" tone="amber" />
        </div>

        {activeSessions.length ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Active table sessions</h2>
                  <p className="text-xs font-semibold text-slate-500">Live QR customers, requests, orders, and expiry at a glance.</p>
                </div>
                <Button variant="outline" onClick={() => void loadTables()}><RefreshCcw className="size-4" />Refresh</Button>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {activeSessions.map((table) => (
                  <article key={table.id ?? table.table} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase text-emerald-700">{table.table} · {table.qrStatus ?? "enabled"}</p>
                        <h3 className="mt-1 text-lg font-black text-slate-950">{table.sessionCustomerName || "Walk-in customer"}</h3>
                        <p className="text-xs font-semibold text-slate-500">{table.sessionCustomerPhone || "No phone"} · {table.sessionGuestCount ?? 1} guests</p>
                      </div>
                      <Badge variant={table.billRequestedAt ? "warning" : "success"}>{table.billRequestedAt ? "Waiting for Bill" : "Active"}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                      <span><Clock3 className="mr-1 inline size-3" />Started {relativeTime(table.sessionCreatedAt)}</span>
                      <span><TimerReset className="mr-1 inline size-3" />Left {remainingTime(table.sessionExpiresAt)}</span>
                      <span><ReceiptText className="mr-1 inline size-3" />{table.currentOrderId || "No order yet"}</span>
                      <span><Smartphone className="mr-1 inline size-3" />{shortDevice(table.deviceId)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void sessionAction(table, "extend-session")}>Extend</Button>
                      <Button size="sm" variant="outline" onClick={() => void sessionAction(table, "transfer-session")}><ArrowRightLeft className="size-4" />Transfer</Button>
                      <Button size="sm" variant="outline" onClick={() => void sessionAction(table, "end-session")}>End</Button>
                    </div>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <label className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-orange-400" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tables by number or floor..." />
            </label>
            <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" value={floor} onChange={(event) => setFloor(event.target.value)}>
              {["All Floors", "Ground Floor", "First Floor", "Terrace"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value as DisplayStatus | "All Status")}>
              {["All Status", "Available", "Occupied", "Reserved", "Cleaning", "Inactive"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold">
              Show inactive
              <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
            </label>
            <div className="ml-auto flex rounded-xl border border-slate-200 p-1">
              <Button size="sm" variant={view === "grid" ? "default" : "ghost"} onClick={() => setView("grid")}><Grid2X2 className="size-4" /> Grid</Button>
              <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}><List className="size-4" /> List</Button>
            </div>
            <Button variant="outline" size="icon" title="Table filters"><Settings2 className="size-4" /></Button>
            <Button variant="outline" disabled={!qrReadyTables.length} onClick={() => void bulkPrintQr()}><Printer className="size-4" />Bulk Print QR</Button>
            <Button variant="outline" disabled={!qrReadyTables.length} onClick={() => void bulkDownloadQr()}><Download className="size-4" />Bulk Download QR</Button>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {Object.entries(grouped).map(([groupName, tables]) => (
            <section key={groupName} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-950">{groupName}</h2>
                <Badge variant="muted">{tables.length} tables</Badge>
              </div>
              <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5" : "grid gap-2"}>
                {tables.map((table) => {
                  const activeOrder = findActiveOrder(orders, table.table);
                  const display = getDisplayStatus(table, activeOrder);
                  return (
                    <button key={table.table} type="button" onClick={() => setSelectedTable(table.table)} className="text-left">
                      <article className={cn("rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", selectedTable?.table === table.table ? "border-orange-300 ring-2 ring-orange-100" : "border-slate-200", view === "list" && "grid grid-cols-[auto_1fr_auto] items-center gap-4")}>
                        <div className="flex items-start justify-between gap-3">
                          <span className={cn("grid size-12 place-items-center rounded-full", statusTone[display])}>
                            <Table2 className="size-5" />
                          </span>
                          <Badge className={cn("border", statusTone[display])}>{display}</Badge>
                        </div>
                        <div className={cn("mt-3", view === "list" && "mt-0")}>
                          <h3 className="text-xl font-black text-slate-950">{table.table}</h3>
                          <p className="text-xs font-semibold text-slate-500">{table.seats} Seater</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">{activeOrder ? `${formatCurrency(activeOrder.total ?? totalFor(activeOrder))} · ${activeOrder.etaMinutes} min` : display === "Cleaning" ? "Cleaning in progress" : display === "Inactive" ? "Not in use" : "Ready for seating"}</p>
                        </div>
                        <div className={cn("mt-3 flex items-center justify-between text-[11px] font-black text-slate-400", view === "list" && "mt-0 justify-end gap-2")}>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{table.floor?.slice(0, 2) ?? inferFloor(table.table).slice(0, 2)}</span>
                          {activeOrder ? <span>{activeOrder.lines.length} items</span> : null}
                        </div>
                      </article>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
        <Card>
          <CardContent className="space-y-5 p-5">
            {selectedTable ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge className={cn("border", statusTone[selectedStatus])}>{selectedStatus}</Badge>
                    <h2 className="mt-3 text-4xl font-black text-slate-950">{selectedTable.table}</h2>
                    <p className="text-sm font-semibold text-slate-500">Table {selectedTable.table.replace(/\D/g, "")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" title="Edit table" onClick={() => editTable(selectedTable)}><Edit3 className="size-4" /></Button>
                    <Button size="icon" variant="outline" title="Duplicate table" onClick={() => duplicateTable(selectedTable)}><Copy className="size-4" /></Button>
                    <Button size="icon" variant="outline" title="Close selected table"><CircleX className="size-4" /></Button>
                  </div>
                </div>
                <div className="grid gap-3 text-sm">
                  <Detail label="Floor" value={selectedTable.floor ?? inferFloor(selectedTable.table)} />
                  <Detail label="Section" value={selectedTable.section ?? selectedTable.floor ?? "Main"} />
                  <Detail label="Capacity" value={`${selectedTable.seats} Seater`} />
                  <Detail label="Status" value={selectedStatus} />
                  <Detail label="Current Order" value={selectedActiveOrder ? formatCurrency(selectedActiveOrder.total ?? totalFor(selectedActiveOrder)) : "No active order"} />
                  <Detail label="Customer" value={selectedTable.sessionCustomerName || "No active customer"} />
                  <Detail label="Mobile" value={selectedTable.sessionCustomerPhone || "Not captured"} />
                  <Detail label="Guests" value={String(selectedTable.sessionGuestCount ?? 0)} />
                  <Detail label="Elapsed" value={elapsedTime(selectedTable.sessionCreatedAt)} />
                  <Detail label="Remaining" value={remainingTime(selectedTable.sessionExpiresAt)} />
                  <Detail label="Current Bill" value={formatCurrency(selectedTable.currentOrderTotal ?? selectedActiveOrder?.total ?? 0)} />
                  <Detail label="Device" value={shortDevice(selectedTable.deviceId)} />
                  <Detail label="Last Activity" value={formatDateTime(selectedTable.lastActivity)} />
                  <Detail label="QR Status" value={selectedTable.qrOrderingEnabled ? selectedTable.qrStatus ?? "enabled" : "disabled"} />
                  <Detail label="Usage Count" value={String(selectedTable.qrUsageCount ?? 0)} />
                  <Detail label="Current Session" value={selectedTable.currentSessionId ? selectedTable.sessionStatus ?? "active" : "None"} />
                  <Detail label="Bill Status" value={selectedTable.billRequestedAt ? "Waiting for Bill" : "Not requested"} />
                  <Detail label="Last Cleaned" value={selectedTable.lastCleanedAt ? new Date(selectedTable.lastCleanedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded"} />
                  <Detail label="Notes" value={selectedTable.note ?? "No notes"} />
                </div>
                <SessionRequests table={selectedTable} />
                <SessionTimeline table={selectedTable} />
                <QrManagementPanel table={selectedTable} restaurantName={restaurantName} onAction={tableAction} />
                <div className="grid gap-2">
                  <Button asChild className="h-12 bg-orange-600 text-white hover:bg-orange-700">
                    <Link href="/owner/pos">Seat Customer</Link>
                  </Button>
                  <Button variant="outline" onClick={() => updateSelected({ status: "Reserved" })}><CalendarCheck className="size-4" /> Mark as Reserved</Button>
                  <Button variant="outline" onClick={() => updateSelected({ status: "Cleaning", lastCleanedAt: new Date().toISOString() })}><Brush className="size-4" /> Mark as Cleaning</Button>
                  <Button variant="outline" onClick={() => updateSelected({ status: "Inactive" })}><Ban className="size-4" /> Mark as Inactive</Button>
                  <Button variant="outline" onClick={() => duplicateTable(selectedTable)}><Copy className="size-4" /> Duplicate Table</Button>
                  {isLiveSession(selectedTable) ? (
                    <>
                      <Button variant="outline" onClick={() => void loadTables()}><RefreshCcw className="size-4" /> Refresh Session</Button>
                      <Button variant="outline" onClick={() => void sessionAction(selectedTable, "extend-session")}><TimerReset className="size-4" /> Extend Session</Button>
                      <Button variant="outline" onClick={() => void sessionAction(selectedTable, "transfer-session")}><ArrowRightLeft className="size-4" /> Transfer Session</Button>
                      <Button variant="outline" onClick={() => void sessionAction(selectedTable, "end-session")}><CircleX className="size-4" /> End Session</Button>
                    </>
                  ) : null}
                  {selectedActiveOrder ? (
                    <Button variant="outline" onClick={() => void changeTableTicketStatus(selectedActiveOrder.id, selectedActiveOrder.status === "ready" ? "served" : "ready")}>
                      <CheckCircle2 className="size-4" />
                      Mark {selectedActiveOrder.status === "ready" ? "served" : "ready"}
                    </Button>
                  ) : null}
                  {deleteBlockedReason ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{deleteBlockedReason}</p> : null}
                  <Button variant="outline" className="border-red-200 text-red-600" disabled={Boolean(deleteBlockedReason)} title={deleteBlockedReason || "Delete table"} onClick={() => { void deleteTable(selectedTable.table); setSelectedTable(""); }}>
                    <Trash2 className="size-4" />
                    Delete Table
                  </Button>
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm font-semibold text-slate-500">Select a table to manage it.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <h3 className="font-black">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline"><LayoutGrid className="size-4" /> Table Layout</Button>
              <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print Layout</Button>
            </div>
          </CardContent>
        </Card>
      </aside>
      {draft ? <TableDialog draft={draft} saving={savingDraft} onChange={setDraft} onClose={() => setDraft(null)} onSave={() => void saveDraft()} onSaveQr={() => void saveDraft(true)} /> : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint, tone }: { icon: ElementType; label: string; value: number; hint: string; tone: "blue" | "green" | "orange" | "violet" | "amber" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <span className={cn("grid size-12 place-items-center rounded-2xl", tones[tone])}><Icon className="size-5" /></span>
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="text-3xl font-black text-slate-950">{value}</p>
          <p className="text-xs font-semibold text-slate-500">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-800">{value}</span>
    </div>
  );
}

function SessionRequests({ table }: { table: PosTable }) {
  const requests = (table.serviceRequests ?? []).slice(-5).reverse();
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <h3 className="flex items-center gap-2 font-black text-slate-950"><ReceiptText className="size-4" />Service Requests</h3>
      <div className="mt-3 space-y-2">
        {requests.length ? requests.map((request) => (
          <div key={`${request.id}-${request.at}`} className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
            <div className="flex items-center justify-between gap-2">
              <span className="capitalize text-slate-950">{request.type.replace(/-/g, " ")}</span>
              <Badge variant={request.status === "open" ? "warning" : "muted"}>{request.status}</Badge>
            </div>
            <p className="mt-1">{request.message || request.type}</p>
            <p className="mt-1 text-slate-400">{formatDateTime(request.at)}</p>
          </div>
        )) : <p className="rounded-xl border border-dashed p-3 text-xs font-semibold text-slate-500">No waiter requests yet.</p>}
      </div>
    </div>
  );
}

function SessionTimeline({ table }: { table: PosTable }) {
  const events = (table.sessionEvents ?? []).slice(-8).reverse();
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <h3 className="flex items-center gap-2 font-black text-slate-950"><History className="size-4" />Table Timeline</h3>
      <div className="mt-3 space-y-2">
        {events.length ? events.map((event, index) => (
          <div key={`${event.type}-${event.at}-${index}`} className="grid grid-cols-[8px_1fr] gap-3 text-xs font-bold">
            <span className="mt-1 size-2 rounded-full bg-orange-500" />
            <div>
              <p className="capitalize text-slate-950">{event.type.replace(/_/g, " ")}</p>
              <p className="text-slate-500">{event.message || event.orderId || event.targetTable || "Session activity"}</p>
              <p className="text-slate-400">{formatDateTime(event.at)}</p>
            </div>
          </div>
        )) : <p className="rounded-xl border border-dashed p-3 text-xs font-semibold text-slate-500">No session timeline yet.</p>}
      </div>
    </div>
  );
}

function TableDialog({ draft, saving, onChange, onClose, onSave, onSaveQr }: { draft: TableDraft; saving: boolean; onChange: (draft: TableDraft) => void; onClose: () => void; onSave: () => void; onSaveQr: () => void }) {
  const update = <K extends keyof TableDraft>(key: K, value: TableDraft[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">{draft.id ? "Edit table" : "Add table"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">QR tokens are signed, rotatable, and do not expose table IDs.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" disabled={saving} onClick={onClose}><CircleX className="size-4" /></Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Table Name" value={draft.name} onChange={(value) => update("name", value)} />
          <Field label="Display Number" value={draft.table} onChange={(value) => update("table", value)} />
          <Field label="Capacity" type="number" value={draft.seats} onChange={(value) => update("seats", value)} />
          <Field label="Floor" value={draft.floor} onChange={(value) => update("floor", value)} />
          <Field label="Section" value={draft.section} onChange={(value) => update("section", value)} />
          <Field label="Description" value={draft.description} onChange={(value) => update("description", value)} />
          <Toggle label="Active" checked={draft.active} onChange={(value) => update("active", value)} />
          <Toggle label="Dine-In Enabled" checked={draft.dineInEnabled} onChange={(value) => update("dineInEnabled", value)} />
          <Toggle label="QR Ordering Enabled" checked={draft.qrOrderingEnabled} onChange={(value) => update("qrOrderingEnabled", value)} />
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="button" variant="outline" disabled={saving} onClick={onSave}>{saving ? "Saving..." : "Save"}</Button>
          <Button type="button" className="bg-orange-600 text-white hover:bg-orange-700" disabled={saving} onClick={onSaveQr}><QrCode className="size-4" />{saving ? "Generating..." : "Save & Generate QR"}</Button>
        </div>
      </section>
    </div>
  );
}

function QrManagementPanel({ table, restaurantName, onAction }: { table: PosTable; restaurantName: string; onAction: (table: PosTable, action: "rotate-qr" | "enable-qr" | "disable-qr") => void }) {
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const [validation, setValidation] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const url = table.qrUrl ?? "";
  const qrValidation = url ? validation : "idle";

  useEffect(() => {
    let active = true;
    if (!url) return undefined;
    void Promise.all([
      QRCode.toDataURL(url, { width: 280, margin: 1 }),
      QRCode.toString(url, { type: "svg", margin: 1 }),
    ]).then(([nextPng, nextSvg]) => {
      if (!active) return;
      setPng(nextPng);
      setSvg(nextSvg);
    });
    return () => { active = false; };
  }, [url]);

  useEffect(() => {
    let active = true;
    if (!url) return undefined;
    window.setTimeout(() => { if (active) setValidation("checking"); }, 0);
    void validateGeneratedQr(table)
      .then(() => { if (active) setValidation("valid"); })
      .catch((error) => {
        console.error("[tables] QR validation failed", { table: table.table, url, error });
        if (active) setValidation("invalid");
      });
    return () => { active = false; };
  }, [table, url]);

  function download(name: string, href: string) {
    const link = document.createElement("a");
    link.href = href;
    link.download = name;
    link.click();
  }

  function downloadSvg() {
    const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(`${table.table}-qr.svg`, href);
    window.setTimeout(() => URL.revokeObjectURL(href), 500);
  }

  function printQr() {
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win || !png) return;
    win.document.write(`<img src="${png}" alt="Table QR" style="width:320px;margin:32px"><p style="font:700 18px sans-serif;text-align:center">${table.table}</p>`);
    win.document.close();
    win.print();
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-slate-950">QR Ordering</h3>
        <div className="flex gap-2">
          <Badge variant={qrValidation === "invalid" ? "destructive" : qrValidation === "valid" ? "success" : "muted"}>{qrValidation === "checking" ? "Checking" : qrValidation === "valid" ? "Verified" : qrValidation === "invalid" ? "Invalid" : "Not checked"}</Badge>
          <Badge variant={table.qrOrderingEnabled ? "success" : "muted"}>{table.qrOrderingEnabled ? "Enabled" : "Disabled"}</Badge>
        </div>
      </div>
      <div className="mt-3 grid place-items-center rounded-xl bg-slate-50 p-3">
        {png ? <Image src={png} alt={`${table.table} QR`} width={160} height={160} unoptimized /> : <p className="text-sm font-semibold text-slate-500">Generate QR to preview.</p>}
      </div>
      <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
        <Detail label="Restaurant" value={restaurantName} />
        <Detail label="Table" value={table.table} />
        <Detail label="Expiry" value={table.qrExpiresAt ? new Date(table.qrExpiresAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "No expiry recorded"} />
        <p className="break-all rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-700">{url || "Generate QR to create a signed URL."}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" disabled={!url} onClick={() => void copyText(url).then(() => toast.success("QR Link Copied")).catch(() => toast.error("QR link could not be copied."))}><Copy className="size-4" />Copy URL</Button>
        <Button type="button" variant="outline" disabled={!url} onClick={() => window.open(url, "_blank", "noopener,noreferrer")}><ExternalLink className="size-4" />Open Link</Button>
        <Button type="button" variant="outline" disabled={!png} onClick={() => download(`${table.table}-qr.png`, png)}><Download className="size-4" />PNG</Button>
        <Button type="button" variant="outline" disabled={!svg} onClick={downloadSvg}><Download className="size-4" />SVG</Button>
        <Button type="button" variant="outline" disabled={!png} onClick={printQr}><Printer className="size-4" />Print</Button>
        <Button type="button" variant="outline" onClick={() => onAction(table, "rotate-qr")}><RefreshCcw className="size-4" />Regenerate</Button>
        <Button type="button" variant="outline" onClick={() => onAction(table, table.qrOrderingEnabled ? "disable-qr" : "enable-qr")}>{table.qrOrderingEnabled ? "Disable" : "Enable"}</Button>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">Last generated: {table.qrLastGeneratedAt ? new Date(table.qrLastGeneratedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not generated"}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
      {label}
      <input type={type} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-orange-400" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function findActiveOrder(orders: TableOrder[], table: string) {
  return orders.find((order) => order.tableNumber === table && !["completed", "billed"].includes(order.status));
}

function getDisplayStatus(table: PosTable, activeOrder?: TableOrder): DisplayStatus {
  if (activeOrder) return "Occupied";
  if (isLiveSession(table)) return "Occupied";
  if (table.status === "Reserved") return "Reserved";
  if (table.status === "Cleaning") return "Cleaning";
  if (table.status === "Inactive") return "Inactive";
  return "Available";
}

function inferFloor(table: string) {
  const number = Number(table.replace(/\D/g, "")) || 1;
  if (number >= 21) return "Terrace";
  if (number >= 11) return "First Floor";
  return "Ground Floor";
}

function groupByFloor(tables: PosTable[]) {
  return tables.reduce<Record<string, PosTable[]>>((groups, table) => {
    const key = table.floor ?? inferFloor(table.table);
    groups[key] = [...(groups[key] ?? []), table];
    return groups;
  }, {});
}

function totalFor(order: TableOrder) {
  return order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

function isLiveSession(table: PosTable) {
  return Boolean(table.currentSessionId && table.sessionStatus === "active" && (!table.sessionExpiresAt || Date.parse(table.sessionExpiresAt) > Date.now()));
}

function formatDateTime(value?: string) {
  if (!value) return "Not recorded";
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
}

function relativeTime(value?: string) {
  if (!value) return "now";
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60_000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function elapsedTime(value?: string) {
  if (!value) return "0m";
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60_000));
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function remainingTime(value?: string) {
  if (!value) return "No expiry";
  const mins = Math.max(0, Math.round((Date.parse(value) - Date.now()) / 60_000));
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function shortDevice(value?: string) {
  return value ? value.slice(0, 12) : "Unknown";
}

function downloadHref(name: string, href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.click();
}

function safeTableName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table";
}

async function readTablesPayload<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || fallback);
  return payload;
}

async function validateGeneratedQr(table: PosTable) {
  if (!table.qrUrl) throw new Error("QR URL was not generated.");
  const parsed = new URL(table.qrUrl, window.location.origin);
  if (parsed.origin !== window.location.origin) throw new Error(`QR URL points to ${parsed.origin}, not this deployment.`);
  const token = parsed.pathname.split("/").filter(Boolean).at(-1);
  if (!token) throw new Error("QR URL does not include a signed token.");
  const response = await fetch(`/api/public/table-order/session?token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as { data?: { table?: { tableNumber?: string } }; error?: string };
  if (!response.ok) throw new Error(payload.error || "QR link could not be reached.");
  if (payload.data?.table?.tableNumber !== table.table) throw new Error("QR link resolves to a different table.");
  return true;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(input);
  if (!ok) throw new Error("Copy failed.");
}
