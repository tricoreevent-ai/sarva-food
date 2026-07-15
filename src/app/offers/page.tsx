"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Gift, LocateFixed, MapPin, Sparkles } from "lucide-react";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { CustomerShell } from "@/components/layout/customer-shell";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { RetryState, SkeletonGrid } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocationCommerce } from "@/hooks/use-location-commerce";
import { usePublicOffers, usePublicRestaurants } from "@/hooks/use-public-data";
import { isOfferForSurface } from "@/lib/offer-engine";
import type { Offer } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

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
  const offerRestaurants = nearbyRestaurants.length ? nearbyRestaurants : restaurants;
  const { offers, status: offersStatus } = usePublicOffers(offerRestaurants);
  const loading = restaurantsStatus === "loading" || offersStatus === "loading";
  const featuredOffers = useMemo(
    () => offers.filter((offer) => isOfferForSurface(offer, "homepage") || offer.featured || offer.sponsored).slice(0, 6),
    [offers],
  );

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
        {!loading && !offerRestaurants.length ? (
          <EmptyStateCard
            title="No nearby offers"
            description="Choose another delivery area or refresh GPS to find restaurants with active offers."
            actionLabel="Browse restaurants"
            actionHref="/restaurants"
          />
        ) : null}

        {!loading && featuredOffers.length ? (
          <section className="customer-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {featuredOffers.map((offer, index) => (
              <FeaturedDealCard
                key={`featured-${offer.restaurantSlug ?? "restaurant"}-${offer.code}`}
                offer={offer}
                tone={(["green", "orange", "blue"] as const)[index % 3]}
                href={`/restaurant/${offer.restaurantSlug ?? offerRestaurants[0]?.slug ?? ""}/menu?offer=${offer.code}`}
              />
            ))}
          </section>
        ) : null}

        {!loading && offerRestaurants.length ? (
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
                  <Link href={`/restaurant/${offer.restaurantSlug ?? offerRestaurants[0].slug}/menu?offer=${offer.code}`}>
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

function FeaturedDealCard({
  offer,
  tone,
  href,
}: {
  offer: Offer;
  tone: "green" | "orange" | "blue";
  href: string;
}) {
  const tones = {
    green: "from-green-50 via-lime-50 to-white text-green-700",
    orange: "from-orange-50 via-amber-50 to-white text-orange-700",
    blue: "from-blue-50 via-sky-50 to-white text-blue-700",
  };

  return (
    <Link
      href={href}
      className={cn(
        "group relative min-h-36 min-w-[19rem] flex-1 overflow-hidden rounded-xl bg-gradient-to-r p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl sm:min-w-[24rem] sm:p-6",
        tones[tone],
      )}
    >
      <div className="relative z-10 max-w-[58%]">
        <p className="text-xs font-black uppercase tracking-normal">Featured deal</p>
        <h2 className="mt-2 text-3xl font-black leading-none">{offerTitle(offer)}</h2>
        <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">{offer.title}</p>
        <span className="mt-4 inline-flex rounded-md border border-current/30 bg-white/65 px-4 py-2 text-sm font-black">
          {offer.code}
        </span>
      </div>
      <div className="absolute -right-7 bottom-0 h-32 w-48 overflow-hidden rounded-tl-full bg-white/45">
        <SafeImage
          src={offer.mobileBanner ?? offer.banner ?? offer.image ?? IMAGE_FALLBACKS.food}
          alt=""
          fill
          fallbackSrc={IMAGE_FALLBACKS.food}
          cloudinaryPreset="offerCard"
          sizes="220px"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}

function offerTitle(offer: Offer) {
  if (offer.discountType === "free-delivery" || offer.offerType === "free-delivery") return "Free delivery";
  if (offer.discountType === "flat" || offer.offerType === "flat") return `${formatCurrency(offer.discount)} OFF`;
  return `${offer.discount}% OFF`;
}
