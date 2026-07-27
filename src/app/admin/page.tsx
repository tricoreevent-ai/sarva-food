"use client";

import Link from "next/link";
import { Activity, AlertTriangle, Bell, DatabaseZap, Plus, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { ReviewManagementPanel } from "@/components/commerce/review-management-panel";
import { SimpleDataTable } from "@/components/dashboard/data-table";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminRepositoryData } from "@/hooks/use-admin-repository-data";
import { formatCurrency } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export default function AdminDashboardPage() {
  const { restaurants, staffMembers: staff, orders, businessApplications, socialPosts, cateringInquiries } = useAdminRepositoryData();
  const pendingRestaurants = restaurants.filter((restaurant) => restaurant.approved === false || restaurant.adminStatus === "Pending Approval" || restaurant.adminStatus === "Under Review").length;
  const subscriptionAlerts = restaurants.filter((restaurant) => restaurant.subscriptionStatus === "expired" || restaurant.subscriptionStatus === "suspended" || restaurant.adminStatus === "Expired" || restaurant.adminStatus === "Suspended").length;
  const pendingApprovals = businessApplications.filter((application) => application.status === "pending").length + pendingRestaurants + socialPosts.filter((post) => post.status === "pending").length;
  const revenue = orders.reduce((sum, order) => sum + order.totals.total, 0);
  const supportAlerts = cateringInquiries.filter((quote) => quote.status === "new").length;
  const primaryCards = [
    { title: "Platform Health", value: "Live", copy: "Runtime, navigation, and Admin shell are reachable.", href: "/admin/system/monitoring", icon: Activity, tone: "success" as const },
    { title: "Production Health", value: "Verify", copy: "Release SHA, Firestore, public APIs, and startup checks.", href: "/admin/system/diagnostics", icon: DatabaseZap, tone: "warning" as const },
  ];
  const actionCards = [
    { title: "Restaurant Growth", value: `${restaurants.length} live`, copy: "Approved restaurants, onboarding quality, and market coverage.", href: "/admin/restaurants", icon: TrendingUp, tone: "accent" as const },
    { title: "Pending Approvals", value: String(pendingApprovals), copy: "Applications, restaurant reviews, and social posts.", href: "/admin/reviews", icon: Bell, tone: pendingApprovals ? "warning" as const : "success" as const },
    { title: "Platform Alerts", value: String(supportAlerts), copy: "Support and catering follow-up queue.", href: "/admin/support", icon: AlertTriangle, tone: supportAlerts ? "warning" as const : "success" as const },
    { title: "Subscriptions", value: String(subscriptionAlerts), copy: "Expired or suspended restaurants.", href: "/admin/subscriptions", icon: ShieldCheck, tone: subscriptionAlerts ? "warning" as const : "success" as const },
  ];
  const operations = [
    { label: "Restaurants", value: String(restaurants.length), delta: "Restaurant List", tone: "info" as const },
    { label: "Orders", value: String(orders.length), delta: "Operations", tone: "accent" as const },
    { label: "Users", value: String(staff.length), delta: "RBAC", tone: "success" as const },
    { label: "Revenue", value: formatCurrency(revenue), delta: "Analytics", tone: "success" as const },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Command center"
        description="Premium restaurant-tech control for onboarding, social publishing, growth, and platform health."
        action={
          <Button asChild>
            <Link href="/admin/restaurants">
              <Plus className="size-4" />
              Onboard restaurant
            </Link>
          </Button>
        }
      />
      <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        {primaryCards.map(({ title, value, copy, href, icon: Icon, tone }) => (
          <Card key={title} className="border-slate-200 shadow-sm">
            <CardContent className="grid min-h-48 content-between gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <Badge variant={tone}>{value}</Badge>
              </div>
              <div>
                <h2 className="text-xl font-black">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="justify-self-start">
                <Link href={href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actionCards.map(({ title, value, copy, href, icon: Icon, tone }) => (
          <Card key={title} className="shadow-sm">
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <Badge variant={tone}>{value}</Badge>
              </div>
              <div>
                <h2 className="font-black">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="justify-self-start">
                <Link href={href}>Review</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="dashboard-grid">
        {operations.map((stat) => (
          <StatsCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Social approvals", `Owner promotions waiting for ${APP_NAME} publishing`, "/admin/social-queue"],
          ["Meta accounts", "Instagram, Facebook, Graph API and tokens", "/admin/meta"],
          ["Restaurant quality", "Review onboarding, menus, and service zones", "/admin/restaurants"],
        ].map(([title, copy, href]) => (
          <Card key={title} className="shadow-sm">
            <CardContent className="space-y-3 p-5">
              <Sparkles className="size-6 text-primary" />
              <h2 className="font-black">{title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{copy}</p>
              <Button asChild variant="secondary" className="w-full">
                <Link href={href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Restaurant onboarding</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleDataTable
              columns={["name", "location", "status", "plan"]}
              rows={restaurants.map((restaurant) => ({
                name: restaurant.name,
                location: restaurant.location,
                status: restaurant.approved === false ? "Setup" : "Live",
                plan: "Firestore",
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
            <h2 className="font-bold">Permissions snapshot</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Roles can govern owner access, delivery operations, marketing studio publishing,
              and billing tools.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/users">Manage users</Link>
            </Button>
            <div className="rounded-md border p-3">
              <p className="flex items-center gap-2 text-sm font-bold"><Activity className="size-4 text-primary" />Live ops signal</p>
              <p className="mt-1 text-xs text-muted-foreground">Restaurant support, campaigns, and review queues are separated for faster admin action.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <ReviewManagementPanel mode="admin" />
    </div>
  );
}
