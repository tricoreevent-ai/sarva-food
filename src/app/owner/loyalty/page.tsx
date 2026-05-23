"use client";

import Link from "next/link";
import { Cake, Edit3, Gift, History, RotateCcw, Star, Users } from "lucide-react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";
import { normalizePhone } from "@/services/restaurant-ops-service";
import { formatCurrency } from "@/lib/utils";

type LoyaltyRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  tier: string;
  totalOrders: number;
  clv: number;
  lastOrder: string;
  inactiveDays: number;
  actions: string;
};

export default function LoyaltyPage() {
  const customers = useAppStore((state) => state.loyaltyCustomers);
  const orders = useAppStore((state) => state.orders);
  const derivedCustomers = orders.reduce<Record<string, LoyaltyRow>>((acc, order) => {
    const phone = normalizePhone(order.customer.phone);
    if (!phone) return acc;
    const existing = acc[phone];
    const lastOrderTime = new Date(order.createdAt).getTime();
    if (!existing) {
      acc[phone] = {
        id: `derived-${phone}`,
        name: order.customer.name,
        phone: order.customer.phone,
        email: "-",
        points: Math.floor(order.totals.total / 100),
        tier: tierForValue(order.totals.total),
        totalOrders: 1,
        clv: order.totals.total,
        lastOrder: order.createdAt,
        inactiveDays: daysSince(order.createdAt),
        actions: phone,
      };
      return acc;
    }
    existing.totalOrders += 1;
    existing.clv += order.totals.total;
    existing.points += Math.floor(order.totals.total / 100);
    existing.tier = tierForValue(existing.clv);
    if (lastOrderTime > new Date(existing.lastOrder).getTime()) {
      existing.lastOrder = order.createdAt;
      existing.inactiveDays = daysSince(order.createdAt);
    }
    return acc;
  }, {});

  const rows: LoyaltyRow[] = [
    ...customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "-",
      points: customer.points,
      tier: customer.tier,
      totalOrders: customer.totalOrders ?? orders.filter((order) => normalizePhone(order.customer.phone) === normalizePhone(customer.phone)).length,
      clv: customer.lifetimeValue,
      lastOrder: customer.lastOrderAt ?? "-",
      inactiveDays: customer.inactiveDays ?? (customer.lastOrderAt ? daysSince(customer.lastOrderAt) : 0),
      actions: normalizePhone(customer.phone),
    })),
    ...Object.values(derivedCustomers).filter((row) => !customers.some((customer) => normalizePhone(customer.phone) === normalizePhone(row.phone))),
  ];
  const ltv = rows.reduce((sum, item) => sum + item.clv, 0);
  const inactive = rows.filter((item) => item.inactiveDays > 30).length;
  const columns: AdvancedColumn<LoyaltyRow>[] = [
    { key: "name", label: "Customer name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "points", label: "Loyalty points", align: "right" },
    { key: "tier", label: "Tier", render: (row) => <Badge variant={row.tier === "VIP" || row.tier === "Gold" ? "success" : "muted"}>{row.tier}</Badge> },
    { key: "totalOrders", label: "Total orders", align: "right" },
    { key: "clv", label: "CLV", align: "right", render: (row) => formatCurrency(row.clv), exportValue: (row) => row.clv },
    { key: "lastOrder", label: "Last order", render: (row) => row.lastOrder === "-" ? "-" : new Date(row.lastOrder).toLocaleDateString() },
    { key: "inactiveDays", label: "Inactive days", align: "right" },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: () => (
        <div className="flex min-w-72 flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><Link href="/owner/pos"><RotateCcw className="size-3" />Reorder</Link></Button>
          <Button size="sm" variant="secondary"><Gift className="size-3" />Coupon</Button>
          <Button size="sm" variant="outline"><History className="size-3" />History</Button>
          <Button size="sm" variant="ghost"><Edit3 className="size-3" />Edit</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Loyalty and retention" description="Customer analytics, point balances, CLV, inactivity risk, history, coupon actions, and reorder support." />
      <section className="dashboard-grid">
        <Metric icon={<Users className="size-5" />} title="Known customers" value={String(rows.length)} note={`${inactive} inactive over 30 days`} />
        <Metric icon={<Star className="size-5" />} title="Loyalty value" value={formatCurrency(ltv)} note={`${rows.reduce((sum, row) => sum + row.points, 0)} active points`} />
        <Metric icon={<Gift className="size-5" />} title="Coupon-ready" value={String(rows.filter((row) => row.inactiveDays > 14).length)} note="Win-back segment" />
        <Metric icon={<Cake className="size-5" />} title="VIP/Gold" value={String(rows.filter((row) => ["VIP", "Gold"].includes(row.tier)).length)} note="High value customers" />
      </section>
      <AdvancedDataTable
        title="Customer loyalty table"
        columns={columns}
        rows={rows}
        pageSize={10}
        searchPlaceholder="Search name, phone, tier"
        exportFilename="loyalty-customers.csv"
      />
    </div>
  );
}

function Metric({ icon, title, value, note }: { icon: React.ReactNode; title: string; value: string; note: string }) {
  return (
    <Card>
      <CardContent className="bg-[linear-gradient(135deg,color-mix(in_srgb,var(--secondary)_24%,transparent),transparent)] p-5">
        {icon}
        <p className="mt-3 text-sm font-bold text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-black">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function tierForValue(value: number) {
  if (value >= 50000) return "VIP";
  if (value >= 15000) return "Gold";
  if (value >= 5000) return "Silver";
  return "Regular";
}

function daysSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}
