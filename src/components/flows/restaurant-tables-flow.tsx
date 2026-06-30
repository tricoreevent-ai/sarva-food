"use client";

import Link from "next/link";
import Image from "next/image";
import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import { Ban, Brush, CalendarCheck, CheckCircle2, CircleX, Copy, Download, Edit3, Grid2X2, LayoutGrid, List, Plus, Printer, QrCode, RefreshCcw, Search, Settings2, Table2, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PosTable, TableOrder } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

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
  const [configuredTables, setConfiguredTables] = useState<PosTable[]>([]);
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [selectedTableId, setSelectedTable] = useState("");
  const [query, setQuery] = useState("");
  const [floor, setFloor] = useState("All Floors");
  const [status, setStatus] = useState<DisplayStatus | "All Status">("All Status");
  const [showInactive, setShowInactive] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [draft, setDraft] = useState<TableDraft | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/owner/tables", { cache: "no-store" }).then((response) => response.json()) as Promise<{ data?: PosTable[] }>,
      fetch("/api/owner/kitchen", { cache: "no-store" }).then((response) => response.json()) as Promise<{ data?: TableOrder[] }>,
    ]).then(([tables, kitchen]) => {
      if (!active) return;
      setConfiguredTables(tables.data ?? []);
      setOrders(kitchen.data ?? []);
    });
    return () => { active = false; };
  }, []);

  const tableRows = useMemo(() => {
    return configuredTables.slice().sort((first, second) => first.table.localeCompare(second.table, undefined, { numeric: true }));
  }, [configuredTables]);

  const selectedTable = tableRows.find((table) => table.table === selectedTableId) ?? tableRows[0];
  const selectedActiveOrder = selectedTable ? findActiveOrder(orders, selectedTable.table) : undefined;
  const selectedStatus = selectedTable ? getDisplayStatus(selectedTable, selectedActiveOrder) : "Available";
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

  function updateSelected(patch: Partial<PosTable>) {
    if (!selectedTable) return;
    void saveTable({ ...selectedTable, ...patch });
  }

  async function saveTable(table: PosTable) {
    const response = await fetch("/api/owner/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(table),
    });
    const payload = await response.json() as { data?: PosTable };
    const next = payload.data ?? table;
    setConfiguredTables((current) => current.some((item) => item.table === next.table) ? current.map((item) => item.table === next.table ? next : item) : [...current, next]);
    return next;
  }

  async function saveDraft(generateQr = false) {
    if (!draft) return;
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
      qrOrderingEnabled: draft.qrOrderingEnabled,
      generateQr,
      lastCleanedAt: new Date().toISOString(),
    } as PosTable & { generateQr?: boolean });
    setSelectedTable(next.table);
    setDraft(null);
    toast.success(generateQr ? "Table saved and QR generated." : "Table saved.");
  }

  async function deleteTable(table: string) {
    const response = await fetch(`/api/owner/tables?table=${encodeURIComponent(table)}`, { method: "DELETE" });
    if (!response.ok) return;
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
                    <Button size="icon" variant="outline" title="Close selected table"><CircleX className="size-4" /></Button>
                  </div>
                </div>
                <div className="grid gap-3 text-sm">
                  <Detail label="Floor" value={selectedTable.floor ?? inferFloor(selectedTable.table)} />
                  <Detail label="Section" value={selectedTable.section ?? selectedTable.floor ?? "Main"} />
                  <Detail label="Capacity" value={`${selectedTable.seats} Seater`} />
                  <Detail label="Status" value={selectedStatus} />
                  <Detail label="Current Order" value={selectedActiveOrder ? formatCurrency(selectedActiveOrder.total ?? totalFor(selectedActiveOrder)) : "No active order"} />
                  <Detail label="QR Status" value={selectedTable.qrOrderingEnabled ? selectedTable.qrStatus ?? "enabled" : "disabled"} />
                  <Detail label="Usage Count" value={String(selectedTable.qrUsageCount ?? 0)} />
                  <Detail label="Current Session" value={selectedTable.currentSessionId ? selectedTable.sessionStatus ?? "active" : "None"} />
                  <Detail label="Last Cleaned" value={selectedTable.lastCleanedAt ? new Date(selectedTable.lastCleanedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded"} />
                  <Detail label="Notes" value={selectedTable.note ?? "No notes"} />
                </div>
                <QrManagementPanel table={selectedTable} onAction={tableAction} />
                <div className="grid gap-2">
                  <Button asChild className="h-12 bg-orange-600 text-white hover:bg-orange-700">
                    <Link href="/owner/pos">Seat Customer</Link>
                  </Button>
                  <Button variant="outline" onClick={() => updateSelected({ status: "Reserved" })}><CalendarCheck className="size-4" /> Mark as Reserved</Button>
                  <Button variant="outline" onClick={() => updateSelected({ status: "Cleaning", lastCleanedAt: new Date().toISOString() })}><Brush className="size-4" /> Mark as Cleaning</Button>
                  <Button variant="outline" onClick={() => updateSelected({ status: "Inactive" })}><Ban className="size-4" /> Mark as Inactive</Button>
                  {selectedActiveOrder ? (
                    <Button variant="outline" onClick={() => void changeTableTicketStatus(selectedActiveOrder.id, selectedActiveOrder.status === "ready" ? "served" : "ready")}>
                      <CheckCircle2 className="size-4" />
                      Mark {selectedActiveOrder.status === "ready" ? "served" : "ready"}
                    </Button>
                  ) : null}
                  <Button variant="outline" className="border-red-200 text-red-600" disabled={Boolean(selectedActiveOrder)} onClick={() => { void deleteTable(selectedTable.table); setSelectedTable(""); }}>
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
      {draft ? <TableDialog draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={() => void saveDraft()} onSaveQr={() => void saveDraft(true)} /> : null}
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

function TableDialog({ draft, onChange, onClose, onSave, onSaveQr }: { draft: TableDraft; onChange: (draft: TableDraft) => void; onClose: () => void; onSave: () => void; onSaveQr: () => void }) {
  const update = <K extends keyof TableDraft>(key: K, value: TableDraft[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">{draft.id ? "Edit table" : "Add table"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">QR tokens are signed, rotatable, and do not expose table IDs.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><CircleX className="size-4" /></Button>
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
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="outline" onClick={onSave}>Save</Button>
          <Button type="button" className="bg-orange-600 text-white hover:bg-orange-700" onClick={onSaveQr}><QrCode className="size-4" />Save & Generate QR</Button>
        </div>
      </section>
    </div>
  );
}

function QrManagementPanel({ table, onAction }: { table: PosTable; onAction: (table: PosTable, action: "rotate-qr" | "enable-qr" | "disable-qr") => void }) {
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const url = table.qrUrl ?? "";

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
        <Badge variant={table.qrOrderingEnabled ? "success" : "muted"}>{table.qrOrderingEnabled ? "Enabled" : "Disabled"}</Badge>
      </div>
      <div className="mt-3 grid place-items-center rounded-xl bg-slate-50 p-3">
        {png ? <Image src={png} alt={`${table.table} QR`} width={160} height={160} unoptimized /> : <p className="text-sm font-semibold text-slate-500">Generate QR to preview.</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" disabled={!url} onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("QR URL copied."))}><Copy className="size-4" />Copy URL</Button>
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
