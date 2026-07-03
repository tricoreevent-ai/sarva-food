"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const cleanOrderId = orderId.trim();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cleanOrderId) return;
    router.push(`/order/${encodeURIComponent(cleanOrderId)}`);
  }

  // Screen note: Track order is standalone so browser-first customers can return without an account.
  return (
    <CustomerShell>
      <main className="container-page grid gap-6 py-5 sm:py-8 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <SectionHeader title="Track order" description="Use your order ID to load the live Firestore order." />
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-2">
                <Label htmlFor="order-search">Order ID</Label>
                <Input id="order-search" value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="ORD-2481" autoComplete="off" />
              </div>
              <Button className="w-full" size="lg" type="submit" disabled={!cleanOrderId}>
                <Search className="size-4" />
                Find order
              </Button>
            </form>
          </CardContent>
        </Card>
        <section className="space-y-4">
          <SectionHeader title="Latest order" description="A live timeline appears after an order is selected." />
          <EmptyStateCard
            title="No order selected"
            description="Search for an order to load its live tracking timeline from Firestore."
            actionLabel="Browse restaurants"
            actionHref="/restaurants"
          />
        </section>
      </main>
    </CustomerShell>
  );
}
