"use client";

import Link from "next/link";
import { Activity, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { ReviewManagementPanel } from "@/components/commerce/review-management-panel";
import { SimpleDataTable } from "@/components/dashboard/data-table";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";

export default function AdminDashboardPage() {
  const restaurants = useAppStore((state) => state.restaurants);
  const staff = useAppStore((state) => state.staffMembers);
  const orders = useAppStore((state) => state.orders);
  const adminStats = [
    { label: "Restaurants", value: String(restaurants.length), delta: "Firestore", tone: "info" as const },
    { label: "Users", value: String(staff.length), delta: "RBAC", tone: "success" as const },
    { label: "Orders", value: String(orders.length), delta: "Live", tone: "accent" as const },
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
      <section className="dashboard-grid">
        {adminStats.map((stat) => (
          <StatsCard key={stat.label} stat={stat} />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Social approvals", "Owner promotions waiting for Sarva publishing", "/admin/social-queue"],
          ["Meta accounts", "Instagram, Facebook, Graph API and tokens", "/admin/meta"],
          ["Restaurant quality", "Review onboarding, menus, and service zones", "/admin/restaurants"],
        ].map(([title, copy, href]) => (
          <Card key={title} className="border-primary/30 bg-primary/10">
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
