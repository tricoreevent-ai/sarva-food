import Link from "next/link";
import { Search } from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TrackOrderPage() {
  // Screen note: Track order is standalone so browser-first customers can return without an account.
  return (
    <CustomerShell>
      <main className="container-page grid gap-6 py-5 sm:py-8 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <SectionHeader
              title="Track order"
              description="Use order ID or phone number to find a Firestore order."
            />
            <div className="grid gap-2">
              <Label htmlFor="order-search">Order ID or phone</Label>
              <Input id="order-search" placeholder="ORD-2481" />
            </div>
            <Button asChild className="w-full" size="lg">
              <Link href="/order/search">
                <Search className="size-4" />
                Find order
              </Link>
            </Button>
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
