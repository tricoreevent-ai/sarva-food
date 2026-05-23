"use client";

import { CreditCard, Download } from "lucide-react";
import { SimpleDataTable } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";

export default function AdminSubscriptionsPage() {
  const restaurants = useAppStore((state) => state.restaurants);
  const subscriptions = restaurants.map((restaurant) => ({
    restaurant: restaurant.name,
    plan: restaurant.approved === false ? "Setup pending" : "Active",
    billing: "Configured in billing provider",
    status: restaurant.approved === false ? "Setup" : "Live",
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Subscriptions"
        description="Plans, billing cycles, invoices, and payment status from live restaurant records."
        action={
          <Button variant="outline">
            <Download className="size-4" />
            Export
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <SimpleDataTable
            columns={["restaurant", "plan", "billing", "status"]}
            rows={subscriptions}
          />
        </CardContent>
      </Card>
      {!subscriptions.length ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            No restaurant subscription records have synced yet.
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <CreditCard className="size-5 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Billing integration, proration, and invoice PDFs are intentionally out of scope.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
