"use client";

import { StatsCard } from "@/components/dashboard/stats-card";
import { SectionHeader } from "@/components/layout/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminRepositoryData } from "@/hooks/use-admin-repository-data";

export default function AdminAnalyticsPage() {
  const { orders, restaurants, staffMembers: staff } = useAdminRepositoryData();
  const adminStats = [
    { label: "GMV", value: String(orders.reduce((sum, order) => sum + order.totals.total, 0)), delta: "Firestore", tone: "success" as const },
    { label: "Restaurants", value: String(restaurants.length), delta: "Live", tone: "info" as const },
    { label: "Team", value: String(staff.length), delta: "RBAC", tone: "accent" as const },
  ];
  const channelCounts = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.channel] = (acc[order.channel] ?? 0) + 1;
    return acc;
  }, {});
  const totalOrders = Math.max(orders.length, 1);

  return (
    <div className="space-y-6">
      <SectionHeader title="Analytics" description="Platform GMV, restaurant health, campaign reach, and cohorts from Firestore data." />
      <section className="dashboard-grid">
        {adminStats.map((stat) => (
          <StatsCard key={stat.label} stat={stat} />
        ))}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Channel mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Web", "Instagram", "POS", "Catering"].map((label) => {
              const value = Math.round(((channelCounts[label] ?? 0) / totalOrders) * 100);
              return (
              <div key={label as string}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{label}</span>
                  <span>{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
                </div>
              </div>
            );})}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Restaurant health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              ["Active", restaurants.filter((item) => item.approved !== false).length],
              ["Needs setup", restaurants.filter((item) => item.approved === false).length],
              ["At risk", 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
