"use client";

import Link from "next/link";
import { ArrowRight, Gift, LocateFixed, MapPin, Sparkles } from "lucide-react";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { CustomerShell } from "@/components/layout/customer-shell";
import { RetryState, SkeletonGrid } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocationCommerce } from "@/hooks/use-location-commerce";
import { usePublicOffers, usePublicRestaurants } from "@/hooks/use-public-data";
import { formatCurrency } from "@/lib/utils";

export default function OffersPage() {
  const { restaurants, status: restaurantsStatus, retry } = usePublicRestaurants();
  const {
    location,
    nearbyRestaurants,
    status: locationStatus,
    detecting,
    permission,
    detectLocation,
  } = useLocationCommerce(restaurants);
  const { offers, status: offersStatus } = usePublicOffers(nearbyRestaurants);
  const loading = restaurantsStatus === "loading" || offersStatus === "loading";

  return (
    <CustomerShell>
      <main className="container-page space-y-6 py-5 sm:py-8">
        <section className="customer-surface food-gradient overflow-hidden rounded-lg p-6 text-white sm:p-8">
          <Badge className="bg-white text-primary">
            <Sparkles className="mr-1 size-3" />
            Deal drops
          </Badge>
          <h1 className="mt-4 max-w-2xl text-4xl font-black leading-none sm:text-6xl">
            Offers built for impulse orders.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/84">
            Codes are shown only for restaurants that deliver to your selected location.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-white/16 text-white ring-1 ring-white/24">
              <MapPin className="mr-1 size-3" />
              {location.address}
            </Badge>
            <Badge className="rounded-full bg-white/16 text-white ring-1 ring-white/24">
              {permission === "granted" ? "GPS on" : permission === "denied" ? "Manual location" : "Location pending"}
            </Badge>
            <Button type="button" size="sm" className="bg-white text-primary hover:bg-white/92" onClick={detectLocation} disabled={detecting}>
              <LocateFixed className="size-4" />
              {detecting ? "Finding" : "Refresh location"}
            </Button>
          </div>
          <p className="mt-3 text-xs font-bold text-white/80">{locationStatus}</p>
        </section>

        {restaurantsStatus === "error" ? <RetryState onRetry={retry} /> : null}
        {loading ? <SkeletonGrid count={3} /> : null}
        {!loading && !nearbyRestaurants.length ? (
          <EmptyStateCard
            title="No nearby offers"
            description="Choose another delivery area or refresh GPS to find restaurants with active offers."
            actionLabel="Browse restaurants"
            actionHref="/restaurants"
          />
        ) : null}

        {!loading && nearbyRestaurants.length ? (
          <section className="grid gap-4 md:grid-cols-3">
          {offers.length ? offers.map((offer) => (
            <Card key={`${offer.restaurantSlug ?? "restaurant"}-${offer.code}`} className="customer-surface overflow-hidden">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <OfferBadge offer={offer} />
                  <div className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground">
                    <Gift className="size-5" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black">{offer.title}</h2>
                  {offer.restaurantName ? (
                    <p className="mt-1 text-xs font-black text-primary">
                      {offer.restaurantName}{typeof offer.restaurantDistanceKm === "number" ? ` - ${offer.restaurantDistanceKm} km away` : ""}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{offer.description}</p>
                </div>
                <div className="rounded-md bg-muted p-3 text-sm font-bold">
                  Min order {formatCurrency(offer.minimumOrder)}
                </div>
                <Button asChild className="w-full" size="lg">
                  <Link href={`/restaurant/${offer.restaurantSlug ?? nearbyRestaurants[0].slug}/menu?offer=${offer.code}`}>
                    Use offer
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )) : (
            <div className="md:col-span-3">
              <EmptyStateCard title="No active offers" description="Active restaurant offers will appear here when available." actionHref="/restaurants" actionLabel="Browse restaurants" />
            </div>
          )}
        </section>
        ) : null}
      </main>
    </CustomerShell>
  );
}
