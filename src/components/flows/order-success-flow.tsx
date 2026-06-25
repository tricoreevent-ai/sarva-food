"use client";

import Link from "next/link";
import { CheckCircle2, ReceiptText, Truck } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRealtimeOrder } from "@/hooks/use-realtime-order";
import { InlineLoading } from "@/components/state/page-state";
import { formatCurrency } from "@/lib/utils";

export function OrderSuccessFlow({ orderId }: { orderId?: string }) {
  const { order, loading } = useRealtimeOrder(orderId);

  if (loading || !order) {
    return <CustomerShell><main className="container-page py-8"><InlineLoading label="Loading order receipt" /></main></CustomerShell>;
  }

  // Success receipt reads the order cache immediately after checkout; tracking can subscribe to Firestore by order ID.
  return (
    <CustomerShell>
      <main className="container-page grid gap-6 py-5 sm:py-8 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <Card className="border-success bg-success/8">
            <CardContent className="space-y-4 p-6">
              <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
              <SectionHeader
                title="Order placed"
                description="The order has entered the owner dashboard queue and is ready for status updates."
              />
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{order.id}</Badge>
                <Badge variant="muted">{order.channel}</Badge>
                {order.offerCode ? <Badge variant="accent">{order.offerCode}</Badge> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-bold">Order summary</h2>
              {order.lines.map((line) => (
                <div key={line.menuItemId} className="flex justify-between gap-3 text-sm">
                  <span>
                    {line.name} x {line.quantity}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(line.price * line.quantity)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-3 font-bold">
                <span>Total paid</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-3">
          <Button asChild size="lg" className="w-full">
            <Link href={`/order/${order.id}`}>
              <Truck className="size-4" />
              Track order
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href="/restaurants">
              <ReceiptText className="size-4" />
              Order more
            </Link>
          </Button>
        </aside>
      </main>
    </CustomerShell>
  );
}
