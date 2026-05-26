"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Ban, Bell, CheckCircle2, Download, PauseCircle, PlayCircle, ShieldAlert, Snowflake, WalletCards } from "lucide-react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";
import type { Restaurant } from "@/lib/types";

type Plan = NonNullable<Restaurant["subscriptionPlan"]>;
type AdminStatus = NonNullable<Restaurant["adminStatus"]>;

const plans: Plan[] = ["Trial", "Starter", "Professional", "Enterprise"];
const statuses: AdminStatus[] = ["Pending Approval", "Active", "Suspended", "Expired", "Under Review"];

type SubscriptionRow = Restaurant & {
  owner: string;
  planLabel: string;
  statusLabel: AdminStatus;
  trialLabel: string;
  nextBillingLabel: string;
  orderingLabel: string;
};

export default function AdminSubscriptionsPage() {
  const restaurants = useAppStore((state) => state.restaurants);
  const staff = useAppStore((state) => state.staffMembers);
  const updateRestaurantAdminState = useAppStore((state) => state.updateRestaurantAdminState);
  const [planFilter, setPlanFilter] = useState<"All" | Plan>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | AdminStatus>("All");

  const rows = useMemo<SubscriptionRow[]>(() => {
    return restaurants
      .map((restaurant) => {
        const ownerId = restaurant.ownerId ?? restaurant.ownerIds?.[0] ?? "";
        const owner = staff.find((member) => member.id === ownerId)?.name ?? (ownerId || "Unassigned");
        const status = deriveAdminStatus(restaurant);
        const plan = restaurant.subscriptionPlan ?? (restaurant.approved === false ? "Trial" : "Professional");
        return {
          ...restaurant,
          owner,
          subscriptionPlan: plan,
          planLabel: plan,
          statusLabel: status,
          trialLabel: restaurant.trialEndsAt ? formatDate(restaurant.trialEndsAt) : plan === "Trial" ? "Set trial date" : "Not on trial",
          nextBillingLabel: restaurant.nextBillingAt ? formatDate(restaurant.nextBillingAt) : "Not scheduled",
          orderingLabel: restaurant.orderingEnabled === false || restaurant.frozen ? "Disabled" : "Enabled",
        };
      })
      .filter((row) => planFilter === "All" || row.subscriptionPlan === planFilter)
      .filter((row) => statusFilter === "All" || row.statusLabel === statusFilter);
  }, [planFilter, restaurants, staff, statusFilter]);

  const metrics = useMemo(() => {
    const all = restaurants.map(deriveAdminStatus);
    return {
      total: restaurants.length,
      active: all.filter((status) => status === "Active").length,
      trial: restaurants.filter((restaurant) => (restaurant.subscriptionPlan ?? "Trial") === "Trial").length,
      attention: all.filter((status) => status !== "Active").length,
    };
  }, [restaurants]);

  async function updateRestaurant(row: Restaurant, patch: Parameters<typeof updateRestaurantAdminState>[1], message: string) {
    await updateRestaurantAdminState(row.slug, patch);
    toast.success(message);
  }

  const columns: AdvancedColumn<SubscriptionRow>[] = [
    { key: "name", label: "Restaurant", searchable: true },
    { key: "owner", label: "Owner", searchable: true },
    {
      key: "planLabel",
      label: "Plan",
      render: (row) => (
        <select
          className="h-9 rounded-md border bg-card px-2 text-sm font-semibold"
          value={row.subscriptionPlan}
          onChange={(event) => void updateRestaurant(row, { subscriptionPlan: event.target.value as Plan, subscriptionStatus: event.target.value === "Trial" ? "trialing" : "active" }, "Plan updated.")}
        >
          {plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
        </select>
      ),
    },
    {
      key: "statusLabel",
      label: "Status",
      render: (row) => <Badge variant={statusVariant(row.statusLabel)}>{row.statusLabel}</Badge>,
    },
    { key: "trialLabel", label: "Trial ends" },
    { key: "nextBillingLabel", label: "Next billing" },
    {
      key: "orderingLabel",
      label: "Ordering",
      render: (row) => <Badge variant={row.orderingLabel === "Enabled" ? "success" : "warning"}>{row.orderingLabel}</Badge>,
    },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex min-w-[360px] flex-wrap gap-2">
          <Button size="sm" onClick={() => void updateRestaurant(row, { adminStatus: "Active", approved: true, orderingEnabled: true, frozen: false, subscriptionStatus: row.subscriptionPlan === "Trial" ? "trialing" : "active" }, "Restaurant activated.")}>
            <CheckCircle2 className="size-3" />
            Activate
          </Button>
          <Button size="sm" variant="outline" onClick={() => void updateRestaurant(row, { orderingEnabled: false, isOpen: false }, "Ordering disabled.")}>
            <PauseCircle className="size-3" />
            Disable ordering
          </Button>
          <Button size="sm" variant="outline" onClick={() => void updateRestaurant(row, { adminStatus: "Suspended", approved: false, subscriptionStatus: "suspended", orderingEnabled: false, isOpen: false }, "Restaurant suspended.")}>
            <Ban className="size-3" />
            Suspend
          </Button>
          <Button size="sm" variant="outline" onClick={() => void updateRestaurant(row, { frozen: !row.frozen, orderingEnabled: row.frozen ? true : false, isOpen: row.frozen ? row.isOpen : false }, row.frozen ? "Restaurant unfrozen." : "Restaurant frozen.")}>
            {row.frozen ? <PlayCircle className="size-3" /> : <Snowflake className="size-3" />}
            {row.frozen ? "Unfreeze" : "Freeze"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => toast.success(`Notification queued for ${row.name}.`)}>
            <Bell className="size-3" />
            Notify
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Subscriptions"
        description="Approve onboarding, control plans, trial periods, ordering access, freezes, and suspension state for every restaurant."
        action={
          <Button variant="outline" onClick={() => exportRestaurants(rows)}>
            <Download className="size-4" />
            Export
          </Button>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric icon={WalletCards} label="Total restaurants" value={metrics.total} />
        <Metric icon={CheckCircle2} label="Active subscriptions" value={metrics.active} tone="success" />
        <Metric icon={PlayCircle} label="Trial period" value={metrics.trial} tone="warning" />
        <Metric icon={ShieldAlert} label="Needs admin action" value={metrics.attention} tone={metrics.attention ? "warning" : "success"} />
      </section>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <label className="grid gap-1 text-xs font-black uppercase text-muted-foreground">
            Plan
            <select className="h-10 rounded-md border bg-card px-3 text-sm normal-case text-foreground" value={planFilter} onChange={(event) => setPlanFilter(event.target.value as "All" | Plan)}>
              <option value="All">All plans</option>
              {plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black uppercase text-muted-foreground">
            Status
            <select className="h-10 rounded-md border bg-card px-3 text-sm normal-case text-foreground" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | AdminStatus)}>
              <option value="All">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </CardContent>
      </Card>

      <AdvancedDataTable
        title="Restaurant subscription controls"
        rows={rows}
        columns={columns}
        pageSize={12}
        searchPlaceholder="Search restaurant or owner"
        exportFilename="restaurant-subscriptions.csv"
      />
    </div>
  );
}

function deriveAdminStatus(restaurant: Restaurant): AdminStatus {
  if (restaurant.adminStatus) return restaurant.adminStatus;
  if (restaurant.frozen) return "Under Review";
  if (restaurant.subscriptionStatus === "expired") return "Expired";
  if (restaurant.subscriptionStatus === "suspended") return "Suspended";
  if (restaurant.approved === false) return "Pending Approval";
  return "Active";
}

function statusVariant(status: AdminStatus) {
  if (status === "Active") return "success";
  if (status === "Suspended" || status === "Expired") return "destructive";
  return "warning";
}

function Metric({ icon: Icon, label, value, tone = "secondary" }: { icon: typeof WalletCards; label: string; value: number; tone?: "secondary" | "success" | "warning" }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-muted-foreground">{label}</p>
          <Badge variant={tone}><Icon className="size-3" /></Badge>
        </div>
        <p className="text-3xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function exportRestaurants(rows: SubscriptionRow[]) {
  const csv = [
    "Restaurant,Owner,Plan,Status,Trial Ends,Next Billing,Ordering",
    ...rows.map((row) => [row.name, row.owner, row.planLabel, row.statusLabel, row.trialLabel, row.nextBillingLabel, row.orderingLabel].map(escapeCsv).join(",")),
  ].join("\n");
  const link = document.createElement("a");
  link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  link.download = "restaurant-subscriptions.csv";
  link.click();
}

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
