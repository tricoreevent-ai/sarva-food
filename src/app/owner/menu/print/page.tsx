"use client";

import Image from "next/image";
import { Download, Printer } from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOwnerMenu } from "@/hooks/use-owner-repository-data";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { APP_NAME } from "@/lib/constants";
import { useAppStore } from "@/lib/app-store";
import { formatCurrency } from "@/lib/utils";

export default function PrintMenuPage() {
  const restaurantId = useAppStore((state) => state.authUser.restaurantSlug);
  const { items: menuItems, status, error, retry } = useOwnerMenu(restaurantId);
  const profile = useAppStore((state) => state.ownerBusinessProfile);
  const categories = Array.from(new Set(menuItems.map((item) => item.category)));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Print menu"
        description="A4 premium two-column menu card with logo, categories, prices, and clean black-white print styling."
        action={<Button onClick={() => window.print()}><Printer className="size-4" />Use browser print</Button>}
      />
      <Card>
        <CardContent className="p-3 sm:p-6">
          {status === "loading" ? (
            <div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Loading printable menu" />
          ) : error ? (
            <EmptyStateCard title="Menu unavailable" description={error} actionHref={null} onRetry={retry} />
          ) : !menuItems.length ? (
            <EmptyStateCard
              title="No menu to print"
              description="Add menu items before printing a customer-facing menu."
              actionLabel="Manage menu"
              actionHref="/owner/menu"
            />
          ) : (
          <div className="mx-auto max-w-4xl border-4 border-double border-foreground bg-white p-8 text-black print:border-black print:shadow-none">
            <header className="mb-8 text-center">
              <Image src={BRAND_ASSETS.appIcon} alt={`${APP_NAME} logo`} width={58} height={58} className="mx-auto rounded-xl" />
              <h1 className="mt-3 text-5xl font-black tracking-normal">{profile?.hotelName ?? "Restaurant menu"}</h1>
              <p className="mt-2 text-sm uppercase">{profile?.cuisineType ?? "Menu"} {profile?.businessAddress ? `· ${profile.businessAddress}` : ""}</p>
            </header>
            <section className="columns-1 gap-10 md:columns-2">
              {categories.map((category) => (
                <div key={category} className="mb-7 break-inside-avoid border border-black p-4">
                  <h2 className="mb-3 border-b border-black pb-2 text-xl font-black uppercase">{category}</h2>
                  <div className="space-y-4">
                    {menuItems.filter((item) => item.category === category).map((item) => (
                      <div key={item.id}>
                        <div className="flex justify-between gap-4">
                          <h3 className="font-black">{item.name}</h3>
                          <span className="font-black">{formatCurrency(item.price)}</span>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-neutral-700">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
            <footer className="mt-8 border-t border-black pt-4 text-center text-sm">
              Scan table QR to order · Prices inclusive of packaging where applicable
            </footer>
          </div>
          )}
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={() => window.print()}>
              <Download className="size-4" />
              Download via print to PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
