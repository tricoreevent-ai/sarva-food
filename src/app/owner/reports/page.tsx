"use client";

import { FileSpreadsheet, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/app-store";
import { formatCurrency } from "@/lib/utils";

type ReportRow = Record<string, string | number | React.ReactNode>;
type DatePreset = "today" | "yesterday" | "last7" | "last30" | "month" | "custom";

export default function OwnerReportsPage() {
  const allOrders = useAppStore((state) => state.orders);
  const allTableOrders = useAppStore((state) => state.tableOrders);
  const allDeliveries = useAppStore((state) => state.deliveries);
  const allTransactions = useAppStore((state) => state.transactions);
  const branches = useAppStore((state) => state.branches);
  const staff = useAppStore((state) => state.staffMembers);
  const inventory = useAppStore((state) => state.inventoryItems);
  const loyaltyCustomers = useAppStore((state) => state.loyaltyCustomers);
  const [preset, setPreset] = useState<DatePreset>("last30");
  const [customStart, setCustomStart] = useState(() => toInputDate(daysAgo(30)));
  const [customEnd, setCustomEnd] = useState(() => toInputDate(new Date()));
  const dateRange = useMemo(() => resolveDateRange(preset, customStart, customEnd), [customEnd, customStart, preset]);
  const orders = useMemo(() => allOrders.filter((order) => inDateRange(order.createdAt, dateRange)), [allOrders, dateRange]);
  const tableOrders = useMemo(() => allTableOrders.filter((order) => inDateRange(order.createdAt, dateRange)), [allTableOrders, dateRange]);
  const transactions = useMemo(() => allTransactions.filter((transaction) => inDateRange(transaction.timestamp, dateRange)), [allTransactions, dateRange]);
  const deliveries = allDeliveries;
  const revenue = orders.reduce((sum, order) => sum + order.totals.total, 0);
  const dineInRevenue = tableOrders.reduce((sum, order) => sum + (order.total ?? order.lines.reduce((lineSum, line) => lineSum + line.price * line.quantity, 0)), 0);
  const grossRevenue = revenue + dineInRevenue;
  const gstLiability = transactions.reduce((sum, transaction) => sum + transaction.taxData.gstAmount, 0) || Math.round(grossRevenue * 0.05);

  const salesRows: ReportRow[] = [
    ...orders.map((order) => ({
      id: order.id,
      date: new Date(order.createdAt).toLocaleDateString(),
      channel: order.channel,
      customer: order.customer.name,
      status: order.status,
      subtotal: order.totals.subtotal,
      tax: order.totals.tax,
      total: order.totals.total,
      payment: order.payment,
    })),
    ...tableOrders.map((order) => ({
      id: order.id,
      date: new Date(order.createdAt).toLocaleDateString(),
      channel: order.orderType ?? "dine-in",
      customer: order.customerName ?? order.guestName ?? "Walk-in",
      status: order.status,
      subtotal: order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
      tax: Math.round((order.total ?? 0) * 0.05),
      total: order.total ?? order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
      payment: "POS",
    })),
  ];
  const gstRows = transactions.map((transaction) => ({
    id: transaction.id,
    date: new Date(transaction.timestamp).toLocaleDateString(),
    branch: branches.find((branch) => branch.id === transaction.branchId)?.name ?? transaction.branchId,
    gstRate: `${transaction.taxData.gstRate}%`,
    gstAmount: transaction.taxData.gstAmount,
    taxable: transaction.subtotal,
    total: transaction.total,
    type: transaction.type,
  }));
  const orderRows = salesRows.map((row) => ({
    ...row,
    items: [...orders, ...tableOrders].find((order) => order.id === row.id)?.lines.length ?? 0,
  }));
  const waiterRows = staff.filter((member) => ["waiter", "cashier"].includes(member.role)).map((member) => {
    const handled = tableOrders.filter((order) => order.waiterName === member.name || order.waiterId === member.id);
    const value = handled.reduce((sum, order) => sum + (order.total ?? order.lines.reduce((lineSum, line) => lineSum + line.price * line.quantity, 0)), 0);
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      branch: branches.find((branch) => branch.id === member.branchId)?.name ?? member.branchId,
      orders: handled.length,
      revenue: value,
      lastActivity: member.lastActivity,
    };
  });
  const kitchenRows = tableOrders.map((order) => ({
    id: order.id,
    table: order.tableNumber,
    status: order.status,
    priority: order.priority,
    eta: order.etaMinutes,
    items: order.lines.length,
    createdAt: new Date(order.createdAt).toLocaleTimeString(),
  }));
  const inventoryRows = inventory.map((item) => ({
    id: item.id,
    item: item.name,
    category: item.category,
    stock: item.currentStock,
    unit: item.unit,
    reorderLevel: item.reorderLevel,
    status: item.currentStock <= item.reorderLevel ? "Reorder" : "OK",
    supplier: item.supplier ?? "-",
  }));
  const loyaltyRows = loyaltyCustomers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    tier: customer.tier,
    points: customer.points,
    totalOrders: customer.totalOrders ?? 0,
    clv: customer.lifetimeValue,
    inactiveDays: customer.inactiveDays ?? 0,
  }));
  const customerRows = salesRows.reduce<ReportRow[]>((rows, order) => {
    const existing = rows.find((row) => row.customer === order.customer);
    if (existing) {
      existing.orders = Number(existing.orders) + 1;
      existing.spend = Number(existing.spend) + Number(order.total);
      return rows;
    }
    rows.push({ id: String(order.customer), customer: order.customer, phone: "-", orders: 1, spend: Number(order.total), lastOrder: order.date });
    return rows;
  }, []);
  const paymentRows = transactions.map((transaction) => ({
    id: transaction.id,
    orderId: transaction.orderId,
    method: transaction.paymentMethod,
    subtotal: transaction.subtotal,
    tax: transaction.taxData.gstAmount,
    total: transaction.total,
    type: transaction.type,
  }));
  const parcelRows = tableOrders.filter((order) => ["takeaway", "parcel"].includes(order.orderType ?? "")).map((order) => ({
    id: order.id,
    type: order.orderType ?? "parcel",
    customer: order.customerName ?? "Walk-in",
    phone: order.customerPhone ?? "-",
    status: order.status,
    total: order.total ?? 0,
  }));
  const deliveryRows = deliveries.map((delivery) => ({
    id: delivery.id,
    orderId: delivery.orderId,
    pickup: delivery.pickup,
    drop: delivery.drop,
    eta: delivery.eta,
    status: delivery.status,
    distanceKm: delivery.distanceKm ?? 0,
  }));
  const cancellationRows = [...orders.filter((order) => order.status === "rejected"), ...tableOrders.filter((order) => order.status === "completed" && !order.total)].map((order) => ({
    id: order.id,
    date: "createdAt" in order ? new Date(order.createdAt).toLocaleDateString() : "-",
    source: "channel" in order ? order.channel : order.source,
    status: order.status,
    value: "totals" in order ? order.totals.total : order.total ?? 0,
    reason: "Customer or staff cancelled",
  }));

  const moneyColumns: AdvancedColumn<ReportRow>[] = [
    { key: "id", label: "ID" },
    { key: "date", label: "Date" },
    { key: "channel", label: "Channel" },
    { key: "customer", label: "Customer" },
    { key: "status", label: "Status", render: (row) => <Badge variant="muted">{String(row.status)}</Badge> },
    { key: "total", label: "Total", align: "right", render: (row) => formatCurrency(Number(row.total ?? 0)), exportValue: (row) => Number(row.total ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Restaurant reports"
        description="Detailed operational reports with sorting, searching, pagination, export, and drill-down tables."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
            <Button variant="outline" onClick={() => exportSummaryCsv(grossRevenue, gstLiability, salesRows.length, dateRange)}><FileSpreadsheet className="size-4" />Summary CSV</Button>
          </div>
        }
      />
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <div>
            <p className="text-sm font-black">Report date range</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Default is last 30 days. Live Firestore reports should query indexed date fields with the same bounds.
            </p>
          </div>
          <div className="customer-scroll flex gap-2 overflow-x-auto">
            {[
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["last7", "Last 7 days"],
              ["last30", "Last 30 days"],
              ["month", "This month"],
              ["custom", "Custom"],
            ].map(([value, label]) => (
              <Button key={value} type="button" size="sm" variant={preset === value ? "default" : "outline"} onClick={() => setPreset(value as DatePreset)}>
                {label}
              </Button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="h-10 rounded-md border bg-background px-3 text-sm" type="date" value={customStart} onChange={(event) => { setCustomStart(event.target.value); setPreset("custom"); }} />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" type="date" value={customEnd} onChange={(event) => { setCustomEnd(event.target.value); setPreset("custom"); }} />
          </div>
        </CardContent>
      </Card>
      <section className="dashboard-grid">
        <Metric title="Gross sales" value={formatCurrency(grossRevenue)} note={`${salesRows.length} orders`} />
        <Metric title="GST liability" value={formatCurrency(gstLiability)} note="From transaction tax data" />
        <Metric title="Dine-in and POS" value={formatCurrency(dineInRevenue)} note={`${tableOrders.length} kitchen records`} />
        <Metric title="Customers" value={String(customerRows.length)} note={`${loyaltyRows.length} loyalty profiles`} />
      </section>
      <Tabs defaultValue="sales">
        <TabsList className="customer-scroll w-full justify-start overflow-x-auto">
          {["sales", "gst", "orders", "waiters", "kitchen", "inventory", "loyalty", "customers", "payments", "parcel", "delivery", "cancellations"].map((tab) => (
            <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="sales" className="mt-4"><AdvancedDataTable title="Sales reports" columns={moneyColumns} rows={salesRows} exportFilename="sales-report.csv" /></TabsContent>
        <TabsContent value="gst" className="mt-4"><AdvancedDataTable title="GST reports" columns={[
          { key: "id", label: "Txn" }, { key: "date", label: "Date" }, { key: "branch", label: "Branch" }, { key: "gstRate", label: "GST" },
          { key: "taxable", label: "Taxable", align: "right", render: (row) => formatCurrency(Number(row.taxable ?? 0)) },
          { key: "gstAmount", label: "GST amount", align: "right", render: (row) => formatCurrency(Number(row.gstAmount ?? 0)) },
          { key: "total", label: "Total", align: "right", render: (row) => formatCurrency(Number(row.total ?? 0)) },
        ]} rows={gstRows} /></TabsContent>
        <TabsContent value="orders" className="mt-4"><AdvancedDataTable title="Order reports" columns={[...moneyColumns, { key: "items", label: "Items", align: "right" }]} rows={orderRows} /></TabsContent>
        <TabsContent value="waiters" className="mt-4"><AdvancedDataTable title="Waiter performance" columns={[
          { key: "name", label: "Name" }, { key: "role", label: "Role" }, { key: "branch", label: "Branch" }, { key: "orders", label: "Orders", align: "right" },
          { key: "revenue", label: "Revenue", align: "right", render: (row) => formatCurrency(Number(row.revenue ?? 0)) }, { key: "lastActivity", label: "Last activity" },
        ]} rows={waiterRows} /></TabsContent>
        <TabsContent value="kitchen" className="mt-4"><AdvancedDataTable title="Kitchen performance" columns={[
          { key: "id", label: "Ticket" }, { key: "table", label: "Table/type" }, { key: "status", label: "Status", render: (row) => <Badge variant="muted">{String(row.status)}</Badge> }, { key: "priority", label: "Priority" },
          { key: "eta", label: "ETA min", align: "right" }, { key: "items", label: "Items", align: "right" }, { key: "createdAt", label: "Created" },
        ]} rows={kitchenRows} /></TabsContent>
        <TabsContent value="inventory" className="mt-4"><AdvancedDataTable title="Inventory reports" columns={[
          { key: "item", label: "Item" }, { key: "category", label: "Category" }, { key: "stock", label: "Stock", align: "right" }, { key: "unit", label: "Unit" },
          { key: "reorderLevel", label: "Reorder", align: "right" }, { key: "status", label: "Status", render: (row) => <Badge variant={row.status === "Reorder" ? "warning" : "success"}>{String(row.status)}</Badge> }, { key: "supplier", label: "Supplier" },
        ]} rows={inventoryRows} /></TabsContent>
        <TabsContent value="loyalty" className="mt-4"><AdvancedDataTable title="Loyalty reports" columns={[
          { key: "name", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "tier", label: "Tier" }, { key: "points", label: "Points", align: "right" },
          { key: "totalOrders", label: "Orders", align: "right" }, { key: "clv", label: "CLV", align: "right", render: (row) => formatCurrency(Number(row.clv ?? 0)) }, { key: "inactiveDays", label: "Inactive days", align: "right" },
        ]} rows={loyaltyRows} /></TabsContent>
        <TabsContent value="customers" className="mt-4"><AdvancedDataTable title="Customer reports" columns={[
          { key: "customer", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "orders", label: "Orders", align: "right" }, { key: "spend", label: "Spend", align: "right", render: (row) => formatCurrency(Number(row.spend ?? 0)) }, { key: "lastOrder", label: "Last order" },
        ]} rows={customerRows} /></TabsContent>
        <TabsContent value="payments" className="mt-4"><AdvancedDataTable title="Payment reports" columns={[
          { key: "id", label: "Txn" }, { key: "orderId", label: "Order" }, { key: "method", label: "Method" }, { key: "subtotal", label: "Subtotal", align: "right", render: (row) => formatCurrency(Number(row.subtotal ?? 0)) },
          { key: "tax", label: "Tax", align: "right", render: (row) => formatCurrency(Number(row.tax ?? 0)) }, { key: "total", label: "Total", align: "right", render: (row) => formatCurrency(Number(row.total ?? 0)) }, { key: "type", label: "Type" },
        ]} rows={paymentRows} /></TabsContent>
        <TabsContent value="parcel" className="mt-4"><AdvancedDataTable title="Parcel and takeaway reports" columns={[
          { key: "id", label: "Ticket" }, { key: "type", label: "Type" }, { key: "customer", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "status", label: "Status" }, { key: "total", label: "Total", align: "right", render: (row) => formatCurrency(Number(row.total ?? 0)) },
        ]} rows={parcelRows} /></TabsContent>
        <TabsContent value="delivery" className="mt-4"><AdvancedDataTable title="Delivery reports" columns={[
          { key: "id", label: "Delivery" }, { key: "orderId", label: "Order" }, { key: "pickup", label: "Pickup" }, { key: "drop", label: "Drop" }, { key: "eta", label: "ETA" }, { key: "status", label: "Status" }, { key: "distanceKm", label: "Km", align: "right" },
        ]} rows={deliveryRows} /></TabsContent>
        <TabsContent value="cancellations" className="mt-4"><AdvancedDataTable title="Cancellation reports" columns={[
          { key: "id", label: "Order" }, { key: "date", label: "Date" }, { key: "source", label: "Source" }, { key: "status", label: "Status" }, { key: "value", label: "Value", align: "right", render: (row) => formatCurrency(Number(row.value ?? 0)) }, { key: "reason", label: "Reason" },
        ]} rows={cancellationRows} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_12%,transparent),transparent)] p-5">
        <p className="text-sm font-bold text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function exportSummaryCsv(grossRevenue: number, gstLiability: number, orders: number, range: { start: Date; end: Date }) {
  const rows = [
    ["Metric", "Value"],
    ["Start date", range.start.toISOString()],
    ["End date", range.end.toISOString()],
    ["Gross revenue", grossRevenue],
    ["GST liability", gstLiability],
    ["Orders", orders],
  ];
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(rows.map((row) => row.join(",")).join("\n"))}`;
  const link = document.createElement("a");
  link.href = href;
  link.download = "restaurant-report-summary.csv";
  link.click();
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function resolveDateRange(preset: DatePreset, customStart: string, customEnd: string) {
  const now = new Date();
  if (preset === "today") return { start: startOfDay(now), end: endOfDay(now) };
  if (preset === "yesterday") {
    const yesterday = daysAgo(1);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
  }
  if (preset === "last7") return { start: startOfDay(daysAgo(6)), end: endOfDay(now) };
  if (preset === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
  if (preset === "custom") return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
  return { start: startOfDay(daysAgo(29)), end: endOfDay(now) };
}

function inDateRange(value: string, range: { start: Date; end: Date }) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= range.start.getTime() && time <= range.end.getTime();
}
