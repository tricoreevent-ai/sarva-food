"use client";

import Link from "next/link";
import { Bell, Clock, PackageCheck, ShoppingBag } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";
import { formatCurrency } from "@/lib/utils";

export default function ParcelPage() {
  const menuItems = useAppStore((state) => state.menuItems);
  const featured = menuItems.slice(0, 6);

  return (
    <CustomerShell>
      <main className="container-page space-y-6 py-5 sm:py-8">
        <section className="customer-surface food-gradient rounded-lg p-6 text-white">
          <Badge className="bg-white text-primary"><PackageCheck className="mr-1 size-3" />Parcel pickup</Badge>
          <SectionHeader title="Order now, pick up hot." description="Fast takeaway and parcel flow with ready notifications." />
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {featured.map((item) => (
            <Card key={item.id} className="customer-surface">
              <CardContent className="space-y-3 p-5">
                <Badge variant="secondary">{item.category}</Badge>
                <h2 className="text-xl font-black">{item.name}</h2>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <p className="text-2xl font-black text-primary">{formatCurrency(item.price)}</p>
                <Button asChild className="w-full">
                  <Link href={`/checkout?mode=fast&orderType=parcel`}>
                    <ShoppingBag className="size-4" />
                    Parcel checkout
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
        <Card className="customer-surface">
          <CardContent className="grid gap-3 p-5 md:grid-cols-3">
            <Info icon={<Clock className="size-5" />} title="Pickup status" copy="Received -> Preparing -> Parcel ready -> Picked up" />
            <Info icon={<Bell className="size-5" />} title="Ready alert" copy="Push/SMS notifications can alert customers when a parcel is ready." />
            <Info icon={<PackageCheck className="size-5" />} title="Counter handoff" copy="Pickup code and receipt can attach to POS later." />
          </CardContent>
        </Card>
      </main>
    </CustomerShell>
  );
}

function Info({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="rounded-md border p-4">{icon}<h2 className="mt-3 font-black">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{copy}</p></div>;
}
