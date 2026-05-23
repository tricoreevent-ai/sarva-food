"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Camera, CheckCircle2, MessageCircle, Plus, ShoppingBag, Zap } from "lucide-react";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { CustomerShell } from "@/components/layout/customer-shell";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { SectionHeader } from "@/components/layout/section-header";
import { RetryState, SkeletonGrid } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePublicMenu, usePublicRestaurant } from "@/hooks/use-public-data";
import { useCartStore } from "@/lib/cart-store";
import { ROUTES } from "@/lib/constants";
import type { MenuItem, Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function FoodItemDetailFlow({
  restaurant,
  item,
  restaurantSlug,
  itemId,
  source,
  offerCode,
}: {
  restaurant?: Restaurant;
  item?: MenuItem;
  restaurantSlug?: string;
  itemId?: string;
  source?: string;
  offerCode?: string;
}) {
  const router = useRouter();
  const { restaurant: loadedRestaurant, status: restaurantStatus, retry: retryRestaurant } = usePublicRestaurant(restaurant?.slug ?? restaurantSlug ?? "");
  const activeRestaurant = restaurant ?? loadedRestaurant;
  const { items, offers, status: menuStatus, retry: retryMenu } = usePublicMenu(activeRestaurant?.slug ?? restaurantSlug);
  const activeItem = item ?? items.find((entry) => entry.id === itemId);
  const activeOffer = offers.find((offer) => offer.code === offerCode);
  const addItem = useCartStore((state) => state.addItem);
  const applyOffer = useCartStore((state) => state.applyOffer);
  const quantity =
    useCartStore((state) => state.items.find((line) => line.id === activeItem?.id)?.quantity) ?? 0;

  useEffect(() => {
    if (activeOffer) {
      applyOffer(activeOffer.code);
    }
  }, [activeOffer, applyOffer]);

  function orderNow() {
    if (!activeItem || activeItem.soldOut) return;
    addItem(activeItem);
    const query = new URLSearchParams({ mode: "fast" });
    if (activeOffer) query.set("offer", activeOffer.code);
    router.push(`${ROUTES.checkout}?${query.toString()}`);
  }

  if (restaurantStatus === "loading" || menuStatus === "loading") {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <SkeletonGrid count={4} />
        </main>
      </CustomerShell>
    );
  }

  if (restaurantStatus === "error") {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <RetryState onRetry={retryRestaurant} />
        </main>
      </CustomerShell>
    );
  }

  if (menuStatus === "error") {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <RetryState onRetry={retryMenu} />
        </main>
      </CustomerShell>
    );
  }

  if (!activeRestaurant || !activeItem) {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <EmptyStateCard
            title="Item is not available"
            description="This menu item was not found in Firestore or is not currently orderable."
            actionLabel="Browse menu"
            actionHref={activeRestaurant ? `/restaurant/${activeRestaurant.slug}/menu` : "/restaurants"}
          />
        </main>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <main className="space-y-6 pb-28 md:pb-8">
        <section className="grid bg-card lg:min-h-[680px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[460px] bg-muted lg:min-h-[680px]">
            <SafeImage
              src={activeItem.image}
              alt={activeItem.name}
              fill
              priority
              fallbackSrc={IMAGE_FALLBACKS.food}
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent lg:hidden" />
            <div className="absolute left-4 top-4">
              <Badge className="bg-white text-primary">
                {source === "instagram" ? "From Instagram" : "Menu item"}
              </Badge>
            </div>
          </div>
          <div className="container-page space-y-5 p-5 sm:p-7 lg:mx-0 lg:w-auto lg:self-center">
            <SectionHeader
              eyebrow={source === "instagram" ? "Reel to order" : activeRestaurant.name}
              title={activeItem.name}
              description={`${activeRestaurant.name} · ${activeItem.category}${activeItem.prepTime ? ` · ${activeItem.prepTime}` : ""}`}
              action={<CartDrawer />}
            />
            <div className="flex flex-wrap gap-2">
              <Badge variant={activeItem.isVeg ? "success" : "warning"}>
                {activeItem.isVeg ? "Veg" : "Non-veg"}
              </Badge>
              {activeItem.isPopular ? <Badge variant="accent">Popular</Badge> : null}
              {activeItem.tags?.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
              {source === "instagram" ? (
                <Badge variant="outline">
                  <Camera className="mr-1 size-3" aria-hidden="true" />
                  Deep link
                </Badge>
              ) : null}
            </div>
            <p className="text-base leading-7 text-muted-foreground">{activeItem.description}</p>
            <p className="text-4xl font-black">{formatCurrency(activeItem.price)}</p>
            {activeOffer ? (
              <Card className="customer-surface border-accent bg-accent/8">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                    Offer auto-applied
                  </div>
                  <OfferBadge offer={activeOffer} />
                </CardContent>
              </Card>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="lg" onClick={() => addItem(activeItem)} disabled={activeItem.soldOut}>
                <Plus className="size-4" />
                {quantity ? `Added x${quantity}` : "Add to cart"}
              </Button>
              <Button size="lg" variant="secondary" onClick={orderNow} disabled={activeItem.soldOut}>
                <Zap className="size-4" />
                Order now
              </Button>
            </div>
            <Button asChild variant="ghost" className="w-full">
              <Link href={ROUTES.checkout}>
                Checkout cart
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link
                href={`/restaurant/${activeRestaurant.slug}/menu?source=${
                  source ?? "web"
                }&offer=${activeOffer?.code ?? ""}&item=${activeItem.id}`}
              >
                Browse full menu
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="w-full"
            >
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `I want to order ${activeItem.name} from ${activeRestaurant.name}.`,
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" />
                WhatsApp this dish
              </a>
            </Button>
          </div>
        </section>

        <div className="fixed inset-x-4 bottom-24 z-30 md:hidden">
          <Button size="lg" className="w-full shadow-lg" onClick={orderNow} disabled={activeItem.soldOut}>
            <ShoppingBag className="size-4" />
            Order now
          </Button>
        </div>
      </main>
    </CustomerShell>
  );
}
