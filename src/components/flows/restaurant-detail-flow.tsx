"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarClock, Camera, ChefHat, Clock, Mail, MessageCircle, PackageCheck, Percent, Phone, Star, Truck } from "lucide-react";
import { FoodItemCard } from "@/components/commerce/food-item-card";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { RetryState, SkeletonGrid } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePublicMenu, usePublicRestaurant } from "@/hooks/use-public-data";
import { isOfferForSurface } from "@/lib/offer-engine";
import type { Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function RestaurantDetailFlow({ slug }: { slug: string }) {
  const [callbackName, setCallbackName] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackStatus, setCallbackStatus] = useState("");
  const { restaurant, status, retry } = usePublicRestaurant(slug);
  const { items: menu, offers } = usePublicMenu(restaurant?.slug);

  if (status === "loading") {
    return (
      <main className="container-page py-6">
        <SkeletonGrid count={4} />
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="container-page py-6">
        <RetryState onRetry={retry} />
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="container-page py-6">
        <EmptyStateCard
          title="Restaurant is not live"
          description="This restaurant was not found in Firestore or has not been approved yet."
          actionLabel="Browse restaurants"
          actionHref="/restaurants"
        />
      </main>
    );
  }

  const visibleOffers = offers.filter((offer) => isOfferForSurface(offer, "restaurant"));
  const capabilityChips = buildCapabilityChips(restaurant);
  const socialOffer = visibleOffers[0];

  return (
    <main className="pb-28 md:pb-8">
      <section className="relative min-h-[calc(100svh-5rem)] overflow-hidden text-white sm:min-h-[520px]">
        <SafeImage src={restaurant.image} alt={`${restaurant.name} restaurant hero`} fill priority fallbackSrc={IMAGE_FALLBACKS.restaurant} sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />
        <div className="container-page relative flex min-h-[calc(100svh-5rem)] flex-col justify-end py-6 sm:min-h-[520px]">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white text-primary">{restaurant.isOpen ? "Open now" : "Taking preorders"}</Badge>
              {restaurant.instagramHandle ? <Badge className="bg-white/16 text-white ring-1 ring-white/25">{restaurant.instagramHandle}</Badge> : null}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-none sm:text-7xl">{restaurant.name}</h1>
            <p className="mt-3 text-lg font-semibold text-white/84">{restaurant.cuisine}</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
              {restaurant.rating > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-primary">
                  <Star className="size-4 fill-current" />
                  {restaurant.rating}
                </span>
              ) : null}
              {restaurant.deliveryTime ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/16 px-3 py-1.5">
                  <Clock className="size-4" />
                  {restaurant.deliveryTime}
                </span>
              ) : null}
              {restaurant.priceForTwo > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/16 px-3 py-1.5">
                  <Truck className="size-4" />
                  {formatCurrency(restaurant.priceForTwo)} for two
                </span>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/92">
                <Link href={`/restaurant/${restaurant.slug}/menu`}>
                  Start order
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {menu[0] ? (
                <Button asChild size="lg" variant="secondary">
                  <Link href={`/instagram/${restaurant.slug}/${menu[0].id}${socialOffer ? `?offer=${socialOffer.code}` : ""}`}>
                    <Camera className="size-4" />
                    Social offer
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="lg" className="bg-white/14 text-white hover:bg-white/22">
                <a href={whatsappHref(restaurant.contact?.whatsapp ?? restaurant.ownerProfile?.businessWhatsapp, `Hi ${restaurant.name}, I need help with an order.`)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {capabilityChips.length ? (
        <section className="container-page -mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {capabilityChips.map(({ label, text, icon: Icon }) => (
            <Card key={label} className="mobile-premium-card">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-black">{label}</span>
                  <span className="block text-xs font-semibold text-muted-foreground">{text}</span>
                </span>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {visibleOffers.length ? (
        <section className={`${capabilityChips.length ? "mt-3" : "-mt-8"} container-page grid gap-3 md:grid-cols-3`}>
          {visibleOffers.slice(0, 3).map((offer) => (
            <Card key={offer.code} className="mobile-premium-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="grid size-10 place-items-center rounded-md bg-secondary text-secondary-foreground">
                  <Percent className="size-5" />
                </div>
                <div>
                  <OfferBadge offer={offer} />
                  <p className="mt-1 text-sm font-bold">{offer.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="container-page mt-6">
        <Tabs defaultValue="popular">
          <TabsList className="customer-scroll sticky top-16 z-20 w-full justify-start overflow-x-auto bg-background/95 backdrop-blur sm:w-auto">
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          <TabsContent value="popular" className="mt-5">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-primary">Best sellers</p>
                <h2 className="mt-1 text-2xl font-black">Order-ready dishes</h2>
              </div>
              <Button asChild variant="ghost">
                <Link href={`/restaurant/${restaurant.slug}/menu`}>Full menu</Link>
              </Button>
            </div>
            {menu.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {menu.slice(0, 4).map((item) => <FoodItemCard key={item.id} item={item} />)}
              </div>
            ) : (
              <EmptyStateCard title="No menu items yet" description="Owner menu items from Firestore will appear here." actionLabel="Manage menu" actionHref="/owner/menu" />
            )}
          </TabsContent>
          <TabsContent value="offers" className="mt-5">
            {visibleOffers.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {visibleOffers.map((offer) => (
                  <Card key={offer.code} className="mobile-premium-card">
                    <CardContent className="space-y-3 p-5">
                      <OfferBadge offer={offer} />
                      <h2 className="font-black">{offer.title}</h2>
                      <p className="text-sm leading-6 text-muted-foreground">{offer.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyStateCard title="No active offers" description="Active Firestore offers will appear here." actionHref="/owner/offers" actionLabel="Manage offers" />
            )}
          </TabsContent>
          <TabsContent value="about" className="mt-5">
            <Card className="mobile-premium-card">
              <CardContent className="space-y-5 p-5">
                <h2 className="text-2xl font-black">{restaurant.name}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {restaurant.location || "Location details will appear after branch setup is complete."}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button asChild variant="outline">
                    <a href={`tel:${restaurant.contact?.phone ?? restaurant.ownerProfile?.businessPhone ?? ""}`}>
                      <Phone className="size-4" />
                      Call
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={whatsappHref(restaurant.contact?.whatsapp ?? restaurant.ownerProfile?.businessWhatsapp, `Hi ${restaurant.name}, please call me back.`)} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-4" />
                      WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={`mailto:${restaurant.contact?.supportEmail ?? restaurant.ownerProfile?.businessEmail ?? ""}`}>
                      <Mail className="size-4" />
                      Email
                    </a>
                  </Button>
                </div>
                <form
                  className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto]"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setCallbackStatus("Requesting callback...");
                    const response = await fetch("/api/public/callback", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        restaurantId: restaurant.slug,
                        name: callbackName,
                        phone: callbackPhone,
                        reason: "callback",
                      }),
                    }).catch(() => null);
                    setCallbackStatus(response?.ok ? "Callback requested." : "Could not request callback.");
                  }}
                >
                  <input className="h-11 rounded-md border bg-background px-3 text-sm" placeholder="Your name" value={callbackName} onChange={(event) => setCallbackName(event.target.value)} />
                  <input className="h-11 rounded-md border bg-background px-3 text-sm" placeholder="Phone number" inputMode="tel" value={callbackPhone} onChange={(event) => setCallbackPhone(event.target.value)} />
                  <Button type="submit" disabled={!restaurant.contact?.callbackEnabled && !restaurant.ownerProfile?.businessPhone}>
                    Request callback
                  </Button>
                  {callbackStatus ? <p className="text-xs font-bold text-muted-foreground sm:col-span-3">{callbackStatus}</p> : null}
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <div className="fixed inset-x-4 bottom-24 z-30 md:hidden">
        <Button asChild size="lg" className="w-full shadow-xl">
          <Link href={`/restaurant/${restaurant.slug}/menu`}>
            Start order
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </main>
  );
}

function whatsappHref(phone?: string, message?: string) {
  const number = (phone ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(message ?? "Hi, I need help with an order.");
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

function buildCapabilityChips(restaurant: Restaurant) {
  const chips: Array<{ label: string; text: string; icon: typeof CalendarClock }> = [];
  if (restaurant.scheduling?.enabled) {
    chips.push({ label: "Schedule order available", text: "Pre-book delivery or pickup", icon: CalendarClock });
  }
  if (restaurant.tags.some((tag) => tag.toLowerCase().includes("catering"))) {
    chips.push({ label: "Catering available", text: "Events and custom quotes", icon: ChefHat });
  }
  if (restaurant.advancedFeatures?.groupOrdering || restaurant.advancedFeatures?.officeOrdering || restaurant.tags.some((tag) => tag.toLowerCase().includes("bulk"))) {
    chips.push({ label: "Bulk orders", text: "Office and party parcels", icon: PackageCheck });
  }
  if (restaurant.advancedFeatures?.preorder || restaurant.tags.some((tag) => tag.toLowerCase().includes("preorder"))) {
    chips.push({ label: "Preorder enabled", text: "Plan ahead with the restaurant", icon: Truck });
  }
  return chips.slice(0, 4);
}
