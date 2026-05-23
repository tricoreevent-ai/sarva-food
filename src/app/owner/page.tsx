"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  ChefHat,
  CreditCard,
  Gift,
  IndianRupee,
  PackageCheck,
  ReceiptText,
  Settings2,
  Table2,
  TrendingUp,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";
import { ChartCard } from "@/components/owner/chart-card";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { OrderList, type OwnerOrderRow } from "@/components/owner/order-list";
import { OwnerTopbar } from "@/components/owner/topbar";
import { QuickActionButton } from "@/components/owner/quick-action";
import { StatCard } from "@/components/owner/stat-card";
import { StatusBadge } from "@/components/owner/status-badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import type { DemoOrder, OrderLine, TableOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function OwnerDashboardPage() {
  const authUser = useAppStore((state) => state.authUser);
  const restaurants = useAppStore((state) => state.restaurants);
  const branches = useAppStore((state) => state.branches);
  const orders = useAppStore((state) => state.orders);
  const tableOrders = useAppStore((state) => state.tableOrders);
  const loyaltyCustomers = useAppStore((state) => state.loyaltyCustomers);
  const metrics = buildDashboardMetrics(orders, tableOrders, loyaltyCustomers.length);
  const restaurant = restaurants.find((item) => item.slug === authUser.restaurantSlug) ?? restaurants[0];
  const ownerName = authUser.name && authUser.name !== "Anonymous" ? authUser.name : "Rajesh";
  const branchName = branches[0]?.name ?? restaurant?.name ?? "Main Branch";

  return (
    <div className="space-y-6">
      <OwnerTopbar ownerName={ownerName} branchName={branchName} liveOrders={metrics.liveOrders} />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(metrics.revenueToday)} delta={`${metrics.revenueDelta} vs yesterday`} icon={IndianRupee} tone="orange" points={metrics.revenueSpark} />
        <StatCard label="Orders" value={String(metrics.ordersToday)} delta={`${metrics.ordersDelta} vs yesterday`} icon={ReceiptText} tone="green" points={metrics.orderSpark} />
        <StatCard label="Avg. Order Value" value={formatCurrency(metrics.avgOrderValue)} delta={`${metrics.avgDelta} vs yesterday`} icon={TrendingUp} tone="purple" points={metrics.avgSpark} />
        <StatCard label="New Customers" value={String(metrics.newCustomers)} delta={`${metrics.customerDelta} vs yesterday`} icon={UserRound} tone="blue" points={metrics.customerSpark} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr_0.95fr]">
        <div className="xl:col-span-2">
          <ChartCard title="Sales Overview" values={metrics.weekRevenue} labels={metrics.weekLabels} />
        </div>
        <div className="space-y-5">
          <DashboardCard>
            <div className="flex items-start gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ReceiptText className="size-7" />
              </span>
              <div>
                <h2 className="text-lg font-black text-neutral-950">Take Orders & Manage Kitchen</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">View and manage incoming orders from dine-in, delivery and online channels.</p>
              </div>
            </div>
            <Button asChild className="mt-5 h-12 w-full justify-between bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href="/owner/pos">
                Open POS
                <ArrowUpRight className="size-5" />
              </Link>
            </Button>
          </DashboardCard>
          <DashboardCard title="Notification & Sound">
            <p className="text-sm font-semibold leading-6 text-slate-600">Loud order alerts, kitchen sounds, repeat rules, and volume controls are managed from Settings.</p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/owner/settings">Open Sound Settings</Link>
            </Button>
          </DashboardCard>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.82fr_1.35fr_0.95fr]">
        <DashboardCard title="Order Status">
          <div className="grid gap-5 sm:grid-cols-[160px_1fr] sm:items-center">
            <DonutChart total={metrics.statusTotal} values={metrics.statusCounts} />
            <div className="space-y-3">
              {metrics.statusCounts.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-black text-neutral-950">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <OrderList orders={metrics.recentOrders} />

        <DashboardCard className="overflow-hidden border-orange-200 bg-gradient-to-br from-orange-500 to-orange-400 text-white">
          <div className="flex min-h-48 flex-col justify-between gap-5">
            <div>
              <h2 className="text-xl font-black">Boost your sales</h2>
              <p className="mt-3 max-w-64 text-sm font-medium leading-6 text-white/90">Create offers and attract new customers.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {metrics.boostAmounts.length ? metrics.boostAmounts.map((amount) => (
                <Link key={amount} href="/owner/profile?tab=offers" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-orange-600">
                  {formatCurrency(amount)}
                </Link>
              )) : (
                <Link href="/owner/profile?tab=offers" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-orange-600">
                  Create Offer
                </Link>
              )}
            </div>
            <Gift className="absolute right-8 top-10 size-24 text-white/30" aria-hidden="true" />
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <DashboardCard
          title="Top Selling Items"
          action={<Link href="/owner/reports" className="text-sm font-bold text-orange-600">View all</Link>}
        >
          {metrics.topItems.length ? (
            <div className="space-y-4">
              {metrics.topItems.map((item, index) => (
                <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <span className="w-5 text-sm font-black">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-neutral-950">{item.name}</p>
                    <p className="text-sm text-slate-500">({item.quantity})</p>
                  </div>
                  <p className="font-black text-neutral-950">{formatCurrency(item.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No top sellers yet" text="Menu and POS sales will populate this list automatically." />
          )}
        </DashboardCard>

        <DashboardCard title="Live Orders">
          <div className="space-y-3">
            {metrics.liveRows.length ? metrics.liveRows.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
                <div>
                  <p className="font-black text-neutral-950">{order.id}</p>
                  <p className="text-sm text-slate-500">{order.time}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
            )) : <EmptyState title="No live orders" text="The current operations queue is clear." />}
          </div>
        </DashboardCard>
      </section>

      <DashboardCard title="Quick Access">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <QuickActionButton href="/owner/kitchen" icon={ChefHat} label="Kitchen Queue" tone="green" />
          <QuickActionButton href="/owner/tables" icon={Table2} label="Tables" tone="blue" />
          <QuickActionButton href="/owner/menu" icon={Utensils} label="Menu" tone="orange" />
          <QuickActionButton href="/owner/inventory" icon={PackageCheck} label="Inventory" tone="purple" />
          <QuickActionButton href="/owner/reports" icon={BarChart3} label="Reports" tone="cyan" />
          <QuickActionButton href="/owner/loyalty" icon={Users} label="Customers" tone="blue" />
          <QuickActionButton href="/owner/employees" icon={Users} label="Employees" tone="orange" />
          <QuickActionButton href="/owner/accounting" icon={CreditCard} label="Accounting" tone="red" />
        </div>
        <Link href="/owner/profile" className="mt-4 flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <p className="font-black text-neutral-950">{ownerName}</p>
            <p className="text-sm text-slate-600">Owner</p>
          </div>
          <Settings2 className="size-5 text-slate-600" />
        </Link>
      </DashboardCard>
    </div>
  );
}

type StatusValue = { label: string; value: number; color: string };

function DonutChart({ total, values }: { total: number; values: StatusValue[] }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const segments = values.reduce<Array<StatusValue & { length: number; offset: number }>>((items, item) => {
    const previousOffset = items.at(-1) ? items.at(-1)!.offset + items.at(-1)!.length : 0;
    return [...items, { ...item, length: total ? (item.value / total) * circumference : 0, offset: previousOffset }];
  }, []);
  return (
    <div className="relative grid size-40 place-items-center">
      <svg viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#eef2f7" strokeWidth="18" />
        {segments.map((item) => (
            <circle
              key={item.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="18"
              strokeDasharray={`${item.length} ${circumference - item.length}`}
              strokeDashoffset={-item.offset}
            />
        ))}
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-black text-neutral-950">{total}</p>
        <p className="text-xs font-semibold text-slate-500">Total</p>
      </div>
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

function buildDashboardMetrics(orders: DemoOrder[], tableOrders: TableOrder[], customerCount: number) {
  const combined = [
    ...orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      amount: order.totals.total,
      customer: order.customer.name,
      lines: order.lines,
    })),
    ...tableOrders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      amount: orderTotal(order),
      customer: order.customerName ?? order.guestName ?? order.tableNumber,
      lines: order.lines,
    })),
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
  const topItems = buildTopItems(combined.flatMap((order) => order.lines));
  const recentOrders: OwnerOrderRow[] = combined
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
    .slice(0, 4)
    .map((order) => ({
      id: order.id,
      time: relativeTime(order.createdAt),
      customer: order.customer,
      status: order.status,
      amount: order.amount,
    }));
  const statusCounts = [
    { label: "New", value: countStatus(combined, ["new", "accepted"]), color: "#8b5cf6" },
    { label: "Preparing", value: countStatus(combined, ["preparing", "occupied"]), color: "#ff7a1a" },
    { label: "Ready", value: countStatus(combined, ["ready"]), color: "#16a34a" },
    { label: "On the way", value: countStatus(combined, ["picked-up", "served"]), color: "#3b82f6" },
  ];
  return {
    revenueToday,
    revenueDelta: percentDelta(revenueToday, revenueYesterday),
    ordersToday,
    ordersDelta: percentDelta(ordersToday, ordersYesterday),
    avgOrderValue,
    avgDelta: percentDelta(avgOrderValue, avgYesterday),
    newCustomers: customerCount,
    customerDelta: "+0%",
    revenueSpark: weekRevenue,
    orderSpark: weekOrders,
    avgSpark: week.map((date) => {
      const dayOrders = combined.filter((order) => isSameDay(order.createdAt, date));
      return dayOrders.length ? sum(dayOrders.map((order) => order.amount)) / dayOrders.length : 0;
    }),
    customerSpark: week.map(() => customerCount),
    weekRevenue,
    weekLabels: week.map((date) => date.toLocaleDateString("en-IN", { weekday: "short" })),
    topItems,
    recentOrders,
    liveRows: recentOrders.filter((order) => !["delivered", "completed", "cancelled", "rejected"].includes(order.status)).slice(0, 4),
    liveOrders: combined.filter((order) => !["delivered", "completed", "cancelled", "rejected"].includes(order.status)).length,
    statusCounts,
    statusTotal: sum(statusCounts.map((item) => item.value)),
    boostAmounts: recentOrders.map((order) => order.amount).filter(Boolean).slice(0, 4),
  };
}

function buildTopItems(lines: OrderLine[]) {
  const items = new Map<string, { name: string; quantity: number; revenue: number }>();
  lines.forEach((line) => {
    const current = items.get(line.name) ?? { name: line.name, quantity: 0, revenue: 0 };
    current.quantity += line.quantity;
    current.revenue += line.quantity * line.price;
    items.set(line.name, current);
  });
  return Array.from(items.values()).sort((first, second) => second.quantity - first.quantity).slice(0, 4);
}

function orderTotal(order: TableOrder) {
  return order.total ?? order.lines.reduce((total, line) => total + line.price * line.quantity, 0);
}

function countStatus(orders: Array<{ status: string }>, statuses: string[]) {
  return orders.filter((order) => statuses.includes(order.status)).length;
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

function percentDelta(current: number, previous: number) {
  if (!previous && current) return "+100%";
  if (!previous) return "+0%";
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function relativeTime(value: string) {
  const diff = Date.now() - Date.parse(value);
  if (!Number.isFinite(diff)) return "now";
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}
