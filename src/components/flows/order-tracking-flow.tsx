"use client";

import Link from "next/link";
import { Bike, MessageCircle, Phone, ReceiptText, Sparkles } from "lucide-react";
import { OrderTimeline } from "@/components/commerce/order-timeline";
import { CustomerShell } from "@/components/layout/customer-shell";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { SectionHeader } from "@/components/layout/section-header";
import { InlineLoading } from "@/components/state/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRealtimeOrder } from "@/hooks/use-realtime-order";
import { readableOrderId } from "@/lib/order-display";
import type { OrderStatus, TimelineStep } from "@/lib/types";
import type { OrderStatus as FirebaseOrderStatus } from "@/types/firebase";

const statusRank: Record<OrderStatus, number> = {
  draft: 0,
  new: 0,
  accepted: 1,
  rejected: 1,
  preparing: 2,
  ready: 3,
  served: 3,
  "picked-up": 4,
  delivered: 5,
  completed: 5,
  cancelled: 1,
};

function makeTimeline(status: OrderStatus): TimelineStep[] {
  const steps = [
    ["Order placed", "Payment and offer code accepted.", "Now", "new"],
    ["Restaurant accepted", "Owner confirmed the kitchen ticket.", "+2 min", "accepted"],
    ["Kitchen preparing", "Food is being prepared.", "+10 min", "preparing"],
    ["Ready for pickup", "Packed and waiting for partner handoff.", "+22 min", "ready"],
    ["Partner pickup", "Delivery OTP checked at handoff.", "+28 min", "picked-up"],
    ["Delivered", "Customer receives the order and invoice.", "+40 min", "delivered"],
  ] as const;
  const current = statusRank[status];

  return steps.map(([label, description, time, stepStatus]) => {
    const rank = statusRank[stepStatus];
    return {
      label,
      description,
      time,
      status: rank < current ? "done" : rank === current ? "active" : "pending",
    };
  });
}

export function OrderTrackingFlow({ orderId }: { orderId: string }) {
  const { order, loading } = useRealtimeOrder(orderId);

  if (loading) {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <InlineLoading label="Loading live order" />
        </main>
      </CustomerShell>
    );
  }

  if (!order) {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <EmptyStateCard
            title="Order not found"
            description="This order is not available in the live queue or local order cache."
            actionLabel="View orders"
            actionHref="/orders"
          />
        </main>
      </CustomerShell>
    );
  }

  const activeOrder = order;
  const status = activeOrder.status as OrderStatus | FirebaseOrderStatus;
  const timeline = makeTimeline(status === "cancelled" ? "rejected" : (status as OrderStatus));
  const displayId = readableOrderId(activeOrder);
  const delayed = orderDelayMinutes(activeOrder.createdAt, activeOrder.prepEstimateMinutes) > 0 && !["ready", "served", "picked-up", "delivered", "completed", "cancelled", "rejected"].includes(String(status));
  const eta = delayed ? "The restaurant is updating your estimated completion time." : `Estimated completion: ${activeOrder.prepEstimateMinutes ?? 30} minutes from acceptance.`;

  // Customer tracking uses Firebase snapshots when enabled and falls back to the local order cache for offline continuity.
  return (
    <CustomerShell>
      <main className="container-page space-y-6 py-5 sm:py-8">
        <section className="customer-surface food-gradient overflow-hidden rounded-lg p-5 text-white sm:p-7">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="size-4" />
            Live tracking
          </div>
          <h1 className="mt-3 text-4xl font-black">Your food is on the move.</h1>
          <p className="mt-2 text-sm text-white/84">Kitchen, pickup, and delivery updates stay synced.</p>
        </section>
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <SectionHeader
            title={`Order ${displayId}`}
            description={
              `Live order status: ${customerStatusLabel(String(order.status))}`
            }
          />
          {delayed ? (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-lg font-black text-orange-950">Preparing longer than expected. Need help?</h2>
                <p className="text-sm font-semibold leading-6 text-orange-900">{eta}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="bg-white" disabled>
                    <Phone className="size-4" />
                    Call restaurant
                  </Button>
                  <Button variant="outline" className="bg-white" disabled>
                    <MessageCircle className="size-4" />
                    Chat restaurant
                  </Button>
                  <Button variant="secondary">
                    <ReceiptText className="size-4" />
                    Track order
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <OrderTimeline steps={timeline} />
        </section>
        <aside className="space-y-4">
          <Card className="customer-surface">
            <CardContent className="space-y-4 p-5">
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Bike className="size-6" />
              </div>
              <h2 className="font-bold">Need help?</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                WhatsApp support can carry the same order ID and latest status.
              </p>
              <Button className="w-full" variant="secondary">
                <MessageCircle className="size-4" />
                WhatsApp restaurant
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/track-order">
                  <ReceiptText className="size-4" />
                  Track another order
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
        </section>
      </main>
    </CustomerShell>
  );
}

function customerStatusLabel(status: string) {
  if (status === "new") return "Waiting for restaurant confirmation";
  if (status === "accepted") return "Restaurant accepted your order";
  if (status === "preparing") return "Kitchen is preparing your food";
  if (status === "ready") return "Food is ready";
  if (status === "picked-up") return "Picked up for service or delivery";
  if (status === "served") return "Served";
  if (status === "delivered" || status === "completed") return "Completed";
  if (status === "cancelled" || status === "rejected") return "Cancelled";
  return "Order update in progress";
}

function orderDelayMinutes(createdAt: unknown, prepEstimateMinutes?: number) {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt instanceof Date ? createdAt : null;
  const createdMs = date?.getTime();
  if (!createdMs || !Number.isFinite(createdMs)) return 0;
  return Math.max(0, Math.floor((Date.now() - createdMs) / 60000) - (prepEstimateMinutes ?? 30));
}
