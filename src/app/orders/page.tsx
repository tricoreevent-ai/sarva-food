"use client";

import Link from "next/link";
import { ArrowRight, History, LogIn, PackageOpen, RefreshCw } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { InlineLoading, RetryState } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCustomerData } from "@/hooks/use-customer-data";
import { parseFirestoreDate } from "@/lib/firestore-date";
import { formatCurrency } from "@/lib/utils";
import type { CustomerOrderDoc, FirestoreDate } from "@/types/firebase";

export default function OrdersPage() {
  const { user, loading, profileState, profile } = useAuthUser();
  const customer = useCustomerData(user?.uid);
  const blockedByRole = Boolean(user && profileState === "success" && profile?.role !== "customer");

  return (
    <CustomerShell>
      <main className="container-page space-y-5 py-5 sm:py-8">
        <section className="customer-surface food-gradient overflow-hidden rounded-lg p-5 text-white sm:p-7">
          <Badge className="bg-white text-primary">
            <History className="mr-1 size-3" />
            Order history
          </Badge>
          <h1 className="mt-4 text-4xl font-black leading-none sm:text-5xl">Your recent orders.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/84">
            Track live orders, reorder completed meals, and keep receipts in one place.
          </p>
        </section>

        {loading || blockedByRole || (user && profileState === "loading") ? (
          <InlineLoading label="Checking customer account" />
        ) : !user ? (
          <Card className="customer-surface">
            <CardContent className="grid min-h-72 place-items-center p-6 text-center">
              <div className="max-w-md">
                <LogIn className="mx-auto size-10 text-primary" />
                <h2 className="mt-4 text-2xl font-black">Sign in to view orders</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Customer orders are tied to your Nammude account and verified delivery address.
                </p>
                <Button asChild size="lg" className="mt-5">
                  <Link href="/login?next=/orders">Sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : customer.status === "loading" ? (
          <InlineLoading label="Loading order history" />
        ) : customer.status === "error" ? (
          <RetryState
            title="Could not load orders"
            description="Order history could not be loaded from Firestore."
            onRetry={customer.retry}
          />
        ) : customer.orders.length ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {customer.error ? (
              <div className="lg:col-span-2 flex items-start gap-3 rounded-md border border-warning/35 bg-warning/10 p-3 text-sm font-semibold text-warning">
                <RefreshCw className="mt-0.5 size-4 shrink-0" />
                <p>{customer.error}</p>
                <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={customer.retry}>
                  Retry
                </Button>
              </div>
            ) : null}
            {customer.orders.map((order) => (
              <OrderHistoryCard key={order.id} order={order} />
            ))}
          </section>
        ) : (
          <EmptyStateCard
            icon={PackageOpen}
            title="No orders yet"
            description="Place an order from a nearby restaurant and it will appear here with live status."
            actionLabel="Browse restaurants"
            actionHref="/restaurants"
          />
        )}
      </main>
    </CustomerShell>
  );
}

function OrderHistoryCard({ order }: { order: CustomerOrderDoc }) {
  return (
    <Card className="customer-surface">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-primary">Order {order.id.slice(0, 8)}</p>
            <h2 className="mt-1 text-xl font-black">{order.status}</h2>
          </div>
          <Badge variant={["completed", "delivered"].includes(order.status) ? "success" : "warning"}>
            {formatShortDate(order.createdAt)}
          </Badge>
        </div>
        <p className="line-clamp-2 text-sm font-semibold text-muted-foreground">
          {order.lines.map((line) => `${line.name} x${line.quantity}`).join(", ")}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-black">{formatCurrency(order.total)}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/order/${order.id}`}>
                Track
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/restaurant/${order.restaurantId}/menu`}>Reorder</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatShortDate(value?: FirestoreDate) {
  if (!value) return "Date pending";
  const date = parseFirestoreDate(value);
  return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Date pending";
}
