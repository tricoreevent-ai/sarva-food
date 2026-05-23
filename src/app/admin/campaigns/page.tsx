"use client";

import { Megaphone, Plus } from "lucide-react";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";

export default function AdminCampaignsPage() {
  const offers = useAppStore((state) => state.offers);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Campaigns"
        description="Platform campaign overview for offers, Instagram pushes, and merchant promotions."
        action={
          <Button>
            <Plus className="size-4" />
            New campaign
          </Button>
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        {offers.length ? offers.map((offer) => (
          <Card key={offer.code}>
            <CardContent className="space-y-3 p-5">
              <Megaphone className="size-6 text-accent" aria-hidden="true" />
              <OfferBadge offer={offer} />
              <h2 className="font-bold">{offer.title}</h2>
              <p className="text-sm text-muted-foreground">{offer.description}</p>
              <Button className="w-full" variant="outline">Review targeting</Button>
            </CardContent>
          </Card>
        )) : (
          <div className="md:col-span-3">
            <EmptyStateCard
              title="No campaigns yet"
              description="Offers and campaigns from Firestore will appear here."
              actionLabel="Create offer"
              actionHref="/owner/offers"
            />
          </div>
        )}
      </section>
    </div>
  );
}
