"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Gift, Star, Users } from "lucide-react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Loyalty = { id: string; customerId?: string; points?: number; tier?: string; totalOrders?: number; lifetimeValue?: number; lastOrderAt?: string };
type Customer = { id: string; name?: string; phone?: string; email?: string; loyaltyPoints?: number; tier?: string; totalOrders?: number; lifetimeValue?: number; inactiveDays?: number; lastOrderAt?: string };
type Analytics = { customers: Customer[]; loyalty: Loyalty[] };

export default function LoyaltyPage() {
  const [data, setData] = useState<Analytics>({ customers: [], loyalty: [] });
  useEffect(() => { void fetch("/api/owner/analytics", { cache: "no-store" }).then((response) => response.json()).then((payload: { data?: Analytics }) => setData(payload.data ?? { customers: [], loyalty: [] })); }, []);
  const loyaltyByCustomer = useMemo(() => new Map(data.loyalty.map((account) => [account.customerId ?? account.id, account])), [data.loyalty]);
  const rows = data.customers.map((customer) => { const account = loyaltyByCustomer.get(customer.id); return { ...customer, points: account?.points ?? customer.loyaltyPoints ?? 0, tier: account?.tier ?? customer.tier ?? "Bronze", totalOrders: account?.totalOrders ?? customer.totalOrders ?? 0, clv: account?.lifetimeValue ?? customer.lifetimeValue ?? 0 }; });
  const columns: AdvancedColumn<(typeof rows)[number]>[] = [{ key: "name", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "points", label: "Points", align: "right" }, { key: "tier", label: "Tier", render: (row) => <Badge variant={row.tier === "VIP" || row.tier === "Gold" ? "success" : "muted"}>{row.tier}</Badge> }, { key: "totalOrders", label: "Orders", align: "right" }, { key: "clv", label: "Lifetime value", align: "right", render: (row) => formatCurrency(row.clv), exportValue: (row) => row.clv }];
  const points = rows.reduce((sum, row) => sum + row.points, 0);
  return <div className="space-y-6"><SectionHeader title="Loyalty and Retention" description="Firestore-backed balances, tiers, order counts, and customer lifetime value." action={<Button asChild variant="outline"><Link href="/owner/settings?tab=loyalty"><Gift className="size-4" />Loyalty Rules</Link></Button>} /><section className="dashboard-grid"><Metric icon={<Users className="size-5" />} title="Known customers" value={String(rows.length)} /><Metric icon={<Star className="size-5" />} title="Active points" value={String(points)} /><Metric icon={<Gift className="size-5" />} title="VIP / Gold" value={String(rows.filter((row) => ["VIP", "Gold"].includes(row.tier)).length)} /></section><AdvancedDataTable title="Canonical loyalty accounts" columns={columns} rows={rows} exportFilename="loyalty.csv" /></div>;
}

function Metric({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) { return <Card><CardContent className="p-5">{icon}<p className="mt-3 text-sm font-bold text-muted-foreground">{title}</p><p className="mt-1 text-3xl font-black">{value}</p></CardContent></Card>; }
