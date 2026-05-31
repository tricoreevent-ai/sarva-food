"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  Heart,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  User,
} from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { LocationHydrationBoundary } from "@/components/location/location-hydration-boundary";
import { LocationSuggestionList } from "@/components/location/location-suggestion-list";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerHomeLoading, RetryState } from "@/components/state/page-state";
import { useLocationCommerce } from "@/hooks/use-location-commerce";
import { usePublicCategories, usePublicMenu, usePublicOffers, usePublicRestaurants } from "@/hooks/use-public-data";
import { useAppStore } from "@/lib/app-store";
import { getCartSubtotal, useCartStore } from "@/lib/cart-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { isOfferForSurface } from "@/lib/offer-engine";
import { resolveHomepageCategories } from "@/services/cms/cms-category-service";
import { getHomepageCmsItems, resolveCmsSettings } from "@/services/cms/cms-homepage-service";
import type { MenuItem, Offer, Restaurant } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function CustomerDiscoveryHome() {
  const { restaurants, status: restaurantsStatus, retry: retryRestaurants } = usePublicRestaurants({ preloadPrimaryMenu: true });
  const { categories: appCategories } = usePublicCategories();
  const {
    location,
    nearbyRestaurants,
    suggestions,
    recentLocations,
    status,
    detecting,
    hydrated,
    permission,
    detectLocation,
    searchPlaces,
    selectLocation,
  } = useLocationCommerce(restaurants);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResultsOpen, setLocationResultsOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const rawCmsSettings = useAppStore((state) => state.cmsSettings) ?? defaultCmsSettings;
  const cmsSettings = useMemo(() => resolveCmsSettings(rawCmsSettings), [rawCmsSettings]);
  const unavailableCopy = cmsSettings.operations ?? defaultCmsSettings.operations!;
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = getCartSubtotal(cartItems);
  const heroRestaurant = nearbyRestaurants[0] ?? restaurants[0];
  const { items: menuItems } = usePublicMenu(heroRestaurant?.slug);
  const { offers: nearbyOffers } = usePublicOffers(nearbyRestaurants.length ? nearbyRestaurants : restaurants);
  const homepageOffers = useMemo(
    () => nearbyOffers.filter((item) => isOfferForSurface(item, "homepage")).slice(0, 6),
    [nearbyOffers],
  );
  const cmsBanners = useMemo(
    () => {
      const homepage = getHomepageCmsItems(cmsSettings);
      return [...homepage.sponsoredAds, ...homepage.banners, ...homepage.announcements].slice(0, 6);
    },
    [cmsSettings],
  );

  const visibleLocationOptions = useMemo(() => {
    const source = locationQuery ? suggestions : [...recentLocations, ...suggestions];
    const seen = new Set<string>();
    return source.filter((item) => {
      const key = `${item.placeId ?? item.address}-${item.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }, [locationQuery, recentLocations, suggestions]);

  const recommendedRestaurants = useMemo(
    () => {
      const source = [...(nearbyRestaurants.length ? nearbyRestaurants : restaurants)];
      if (cmsSettings.featuredRestaurants?.sortLogic === "manual" && cmsSettings.featuredRestaurants.pinnedRestaurantSlugs.length) {
        const priority = new Map(cmsSettings.featuredRestaurants.pinnedRestaurantSlugs.map((slug, index) => [slug, index]));
        return source.sort((first, second) => (priority.get(first.slug) ?? 999) - (priority.get(second.slug) ?? 999)).slice(0, 8);
      }
      return source.sort((first, second) => (second.rating ?? 0) - (first.rating ?? 0)).slice(0, 8);
    },
    [cmsSettings.featuredRestaurants, nearbyRestaurants, restaurants],
  );

  const popularItems = useMemo(() => {
    const nearbySlugs = new Set(recommendedRestaurants.map((restaurant) => restaurant.slug));
    const scoped = menuItems
      .filter((item) => nearbySlugs.size ? nearbySlugs.has(item.restaurantSlug) : true)
      .sort((first, second) => Number(Boolean(second.isPopular)) - Number(Boolean(first.isPopular)));
    return Array.from(new Map(scoped.map((item) => [item.id, item])).values()).slice(0, 8);
  }, [menuItems, recommendedRestaurants]);

  const categoryChips = useMemo(
    () => resolveHomepageCategories(appCategories),
    [appCategories],
  );
  const categoryImages = useMemo(() => {
    const map = new Map<string, string>();
    for (const chip of categoryChips) {
      const match = menuItems.find((item) =>
        item.category.toLowerCase().includes(chip.name.toLowerCase()) ||
        item.name.toLowerCase().includes(chip.name.toLowerCase()) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(chip.name.toLowerCase())),
      );
      if (chip.image || match?.image) map.set(chip.slug, chip.image || match?.image || "");
    }
    return map;
  }, [categoryChips, menuItems]);

  function handleLocationSelect(nextLocation: typeof visibleLocationOptions[number]) {
    selectLocation(nextLocation);
    setLocationQuery(nextLocation.label);
    setLocationResultsOpen(false);
  }

  if (restaurantsStatus === "loading") {
    return <CustomerHomeLoading />;
  }

  if (restaurantsStatus === "error") {
    return (
      <main className="container-page py-6">
        <RetryState
          title={unavailableCopy.customerUnavailableTitle}
          description={unavailableCopy.customerUnavailableMessage}
          onRetry={retryRestaurants}
        />
      </main>
    );
  }

  if (!heroRestaurant) {
    return (
      <main className="container-page py-6">
        <EmptyStateCard
          title="Restaurants are getting ready"
          description="Please check back shortly. Nearby restaurants will appear here as soon as they are ready to accept orders."
          actionHref={null}
        />
      </main>
    );
  }

  const offer = homepageOffers[0];
  const heroItem = popularItems[0];
  const freeDeliveryTarget = heroRestaurant.deliverySettings?.freeDeliveryAbove;
  const freeDeliveryProgress = freeDeliveryTarget ? Math.min(100, Math.round((cartSubtotal / freeDeliveryTarget) * 100)) : 0;
  const freeDeliveryRemaining = freeDeliveryTarget ? Math.max(0, freeDeliveryTarget - cartSubtotal) : 0;

  return (
    <main className="min-h-screen overflow-hidden pb-8 md:pb-16">
      {cmsSettings.announcementBar?.visible && cmsSettings.announcementBar.message ? (
        <Link
          href={cmsSettings.announcementBar.redirectUrl || "/offers"}
          className="block px-4 py-2 text-center text-sm font-black"
          style={{ backgroundColor: cmsSettings.announcementBar.backgroundColor || "#fff7ed" }}
        >
          {cmsSettings.announcementBar.message}
        </Link>
      ) : null}
      <section className="relative overflow-hidden px-4 pb-4 pt-4 md:hidden">
        <div className="pointer-events-none absolute -right-20 top-0 size-64 rounded-full bg-primary/8 blur-2xl" />
        <div className="relative flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => detectLocation()}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <MapPin className="size-7 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-muted-foreground">Deliver to</span>
              <span className="flex min-w-0 items-center gap-1 text-[1.05rem] font-black leading-tight">
                <span className="truncate">
                  <LocationHydrationBoundary>{location.label || location.address}</LocationHydrationBoundary>
                </span>
                <ChevronDown className="size-4 shrink-0 text-primary" />
              </span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" size="icon" variant="outline" className="relative size-11 rounded-full bg-white shadow-sm" aria-label="Notifications">
              <Bell className="size-5" />
              <span className="absolute right-3 top-3 size-2 rounded-full bg-primary" />
            </Button>
            <Button asChild size="icon" className="size-11 rounded-full bg-primary shadow-xl" aria-label="Profile">
              <Link href="/profile">
                <User className="size-6" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-[1fr_7.6rem] items-end gap-1">
          <div className="pb-2">
            <p className="text-[0.98rem] font-black tracking-normal">Good Morning, Ananya!</p>
            <h1 className="mt-2 max-w-[14.5rem] text-[1.95rem] font-black leading-[1.04] tracking-normal">
              What&apos;s on your <span className="text-primary">mind today?</span>
            </h1>
          </div>
          <div className="relative h-32 overflow-visible">
            <div className="absolute -right-10 bottom-0 size-32 overflow-hidden rounded-full bg-orange-100 shadow-2xl">
              <SafeImage
                src={heroItem?.image ?? heroRestaurant.image}
                alt={heroItem?.name ?? heroRestaurant.name}
                fill
                priority
                fallbackSrc={IMAGE_FALLBACKS.food}
                sizes="130px"
                className="object-cover"
              />
            </div>
            <span className="absolute left-2 top-5 size-3 rounded-full bg-primary/25" />
            <span className="absolute right-5 top-2 size-3 rounded-full bg-primary" />
          </div>
        </div>

        <div className="relative z-10 -mt-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 rounded-[1.35rem] border-white bg-white pl-12 pr-16 text-[0.92rem] shadow-xl"
              placeholder="Search for food, restaurants..."
              value={locationQuery}
              onChange={(event) => {
                setLocationQuery(event.target.value);
                setLocationResultsOpen(Boolean(event.target.value.trim()));
                searchPlaces(event.target.value);
              }}
              onFocus={() => setLocationResultsOpen(Boolean(locationQuery.trim()))}
              aria-label="Search food or delivery location"
            />
            <Button
              type="button"
              size="icon"
              className="absolute right-1.5 top-1/2 size-10 -translate-y-1/2 rounded-full shadow-lg"
              onClick={() => {
                setLocationResultsOpen(false);
                detectLocation();
              }}
              disabled={detecting}
              aria-label={detecting ? "Finding location" : "Use current location"}
            >
              {detecting ? <LocateFixed className="size-5 animate-pulse" /> : <SlidersHorizontal className="size-5" />}
            </Button>
          </div>
          <p className="sr-only">{hydrated ? statusLabel(status, permission) : "Choose delivery location"}</p>
          {locationResultsOpen ? (
            <div className="mt-3 rounded-2xl border bg-card p-2 shadow-xl">
              <LocationSuggestionList locations={visibleLocationOptions} onSelect={handleLocationSelect} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="hidden md:block">
        <div className="container-page pt-6">
          <div className="relative min-h-[22.5rem] overflow-hidden rounded-[1.35rem] bg-[linear-gradient(110deg,#fff7ef_0%,#fffdf9_47%,#ffe5d3_100%)] px-10 py-10 shadow-[0_22px_70px_rgba(255,90,47,0.12)] ring-1 ring-orange-100 lg:px-16">
            <div className="relative z-10 max-w-xl">
              {cmsSettings.homepage?.visible !== false && cmsSettings.homepage.title ? (
                <h1 className="text-5xl font-black leading-[1.05] tracking-normal xl:text-[3.65rem]">
                  {cmsSettings.homepage.title}
                </h1>
              ) : null}
              {cmsSettings.homepage?.visible !== false && cmsSettings.homepage.subtitle ? (
                <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">
                  {cmsSettings.homepage.subtitle}
                </p>
              ) : null}
              <div className="mt-7 flex max-w-xl items-center gap-3">
                <button
                  type="button"
                  onClick={() => detectLocation()}
                  className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-lg border bg-white px-5 text-left shadow-sm"
                >
                  <MapPin className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-black">
                    <LocationHydrationBoundary>{location.label || location.address}</LocationHydrationBoundary>
                  </span>
                  <span className="text-xs font-black text-primary">Change</span>
                </button>
                <Button asChild size="lg" className="h-14 rounded-lg px-8 shadow-xl shadow-primary/20">
                  <Link href={cmsSettings.homepage.ctaLink || "/restaurants"}>{cmsSettings.homepage.ctaText || "Find Food"}</Link>
                </Button>
              </div>
            </div>
            <div className="absolute -right-6 -top-20 h-[32rem] w-[42rem]">
              <div className="absolute inset-16 rounded-full bg-primary/10" />
              <div className="absolute right-14 top-20 size-[24rem] overflow-hidden rounded-full bg-white shadow-2xl ring-8 ring-white/60 xl:size-[27rem]">
                <SafeImage
                  src={cmsSettings.homepage.backgroundImage || heroItem?.image || heroRestaurant.image}
                  alt={heroItem?.name ?? heroRestaurant.name}
                  fill
                  priority
                  fallbackSrc={IMAGE_FALLBACKS.food}
                  sizes="460px"
                  className="object-cover"
                />
              </div>
              <span className="absolute left-16 top-36 size-10 rounded-full bg-primary/80 shadow-xl" />
              <span className="absolute right-24 top-6 size-14 rounded-full bg-red-500/90 shadow-xl" />
              <span className="absolute bottom-20 left-24 size-8 rounded-full bg-green-500/80 shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {cmsSettings.sections?.categoriesVisible !== false && categoryChips.length ? (
      <section className="customer-scroll flex gap-3 overflow-x-auto px-4 pb-4 md:hidden">
        <Link
          href="/restaurants"
          className="flex w-[4.25rem] shrink-0 flex-col items-center gap-2 text-center"
        >
          <span className="food-gradient grid size-14 place-items-center overflow-hidden rounded-full border border-transparent text-white shadow-xl">
            <Grid2X2 className="size-6" />
          </span>
          <span className="text-xs font-bold">All</span>
        </Link>
        {categoryChips.slice(0, 10).map((chip) => (
          <Link
            key={chip.id}
            href={`/restaurants?query=${encodeURIComponent(chip.name)}`}
            className="flex w-[4.25rem] shrink-0 flex-col items-center gap-2 text-center"
          >
            <span className="grid size-14 place-items-center overflow-hidden rounded-full border bg-white shadow-md" style={{ borderColor: chip.colorTheme ?? undefined }}>
              <SafeImage
                src={categoryImages.get(chip.slug) || IMAGE_FALLBACKS.food}
                alt={chip.name}
                width={50}
                height={50}
                fallbackSrc={IMAGE_FALLBACKS.food}
                className="size-11 rounded-full object-cover"
              />
            </span>
            <span className="text-xs font-bold">{chip.name}</span>
          </Link>
        ))}
      </section>
      ) : null}

      {cmsSettings.sections?.categoriesVisible !== false && categoryChips.length ? (
      <section className="container-page hidden gap-4 py-5 md:flex">
        <Link
          href="/restaurants"
          className="group flex h-[5.25rem] min-w-24 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 text-center text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
        >
          <span className="grid size-10 place-items-center overflow-hidden rounded-full text-primary">
            <Grid2X2 className="size-6" />
          </span>
          <span className="text-sm font-black">All</span>
        </Link>
        {categoryChips.slice(0, 9).map((chip) => (
          <Link
            key={chip.id}
            href={`/restaurants?query=${encodeURIComponent(chip.name)}`}
            className="group flex h-[5.25rem] min-w-24 flex-1 flex-col items-center justify-center gap-2 rounded-xl border bg-white text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
          >
            <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-orange-50">
              <SafeImage
                src={categoryImages.get(chip.slug) || IMAGE_FALLBACKS.food}
                alt={chip.name}
                width={40}
                height={40}
                fallbackSrc={IMAGE_FALLBACKS.food}
                className="size-10 rounded-full object-cover"
              />
            </span>
            <span className="text-sm font-black">{chip.name}</span>
          </Link>
        ))}
      </section>
      ) : null}

      {cmsBanners.length ? (
        <section className="customer-scroll container-page flex gap-4 overflow-x-auto pb-5">
          {cmsBanners.map((banner) => (
            <Link
              key={banner.id}
              href={banner.ctaHref || "/restaurants"}
              className="grid min-h-28 min-w-[18rem] max-w-sm shrink-0 grid-cols-[1fr_96px] gap-3 overflow-hidden rounded-2xl border bg-white p-3 shadow-sm md:min-w-[24rem]"
            >
              <span className="min-w-0">
                <span className="line-clamp-1 text-sm font-black text-primary">{banner.title}</span>
                <span className="mt-1 line-clamp-2 block text-xs font-semibold text-muted-foreground">{banner.subtitle}</span>
                {banner.ctaLabel ? <span className="mt-3 inline-flex text-xs font-black text-orange-600">{banner.ctaLabel}</span> : null}
              </span>
              <span className="relative overflow-hidden rounded-xl bg-orange-50">
                <SafeImage src={banner.mobileImageUrl || banner.imageUrl || IMAGE_FALLBACKS.food} alt={banner.title} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="120px" className="object-cover" />
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {cmsSettings.sections?.offersVisible !== false && offer ? (
      <section className="px-4 md:hidden">
        <Link href={offer?.restaurantSlug ? `/restaurant/${offer.restaurantSlug}/menu?offer=${offer.code}` : "/offers"} className="relative block min-h-34 overflow-hidden rounded-[1.2rem] food-gradient p-4 text-white shadow-xl">
          <div className="relative z-10 max-w-[56%]">
            <p className="text-xs font-black uppercase">{cmsSettings.sections?.offerTitle || "Today&apos;s special"}</p>
            <h2 className="mt-2 text-2xl font-black leading-none">
              {offerTitle(offer)}
            </h2>
            <p className="mt-2 text-sm font-bold">{offer.title}</p>
            <span className="mt-3 inline-flex items-center gap-3 rounded-xl border border-white/60 px-4 py-2 text-sm font-black">
              {offer.code}
              <ChevronRight className="size-4" />
            </span>
          </div>
          <div className="absolute -right-7 bottom-0 size-36 overflow-hidden rounded-full bg-white/18">
            <SafeImage src={heroItem?.image ?? heroRestaurant.image} alt={heroItem?.name ?? heroRestaurant.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="150px" className="object-cover" />
          </div>
        </Link>
        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((item) => (
            <span key={item} className={cn("h-2 rounded-full", item === 0 ? "w-5 bg-primary" : "w-2 bg-border")} />
          ))}
        </div>
      </section>
      ) : null}

      {cmsSettings.sections?.offersVisible !== false && homepageOffers.length ? (
        <section className="customer-scroll container-page hidden gap-5 overflow-x-auto pb-6 md:flex">
          {homepageOffers.map((item, index) => (
            <DesktopPromoCard
              key={item.code}
              tone={(["green", "orange", "blue"] as const)[index % 3]}
              title={offerTitle(item)}
              subtitle={item.title}
              code={item.code}
              image={item.banner ?? item.image ?? popularItems[index + 1]?.image ?? heroRestaurant.image}
              href={item.restaurantSlug ? `/restaurant/${item.restaurantSlug}/menu?offer=${item.code}` : "/offers"}
            />
          ))}
        </section>
      ) : null}

      {cmsSettings.sections?.featuredRestaurantsVisible !== false ? (
        <>
          <MobileSectionHeader title={cmsSettings.sections?.recommendedTitle || "Recommended for you"} href="/restaurants" />
          <section className="customer-scroll mx-auto flex w-full max-w-[1180px] gap-4 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
            {recommendedRestaurants.slice(0, 8).map((restaurant, index) => (
              <MobileRestaurantCard key={restaurant.id} restaurant={restaurant} priority={index === 0} />
            ))}
          </section>
        </>
      ) : null}

      {cmsSettings.sections?.popularItemsVisible !== false && popularItems.length ? (
        <>
          <MobileSectionHeader title={cmsSettings.sections?.popularTitle || "What's popular"} href={`/restaurant/${heroRestaurant.slug}/menu`} />
          <section className="customer-scroll mx-auto flex w-full max-w-[1180px] gap-4 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
            {popularItems.slice(0, 8).map((item) => (
              <PopularDishCard key={item.id} item={item} onAdd={() => addItem(item)} />
            ))}
          </section>
        </>
      ) : null}

      {freeDeliveryTarget ? (
      <section className="px-4 pt-3 md:hidden">
        <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 shadow-sm">
          <span className="grid size-10 place-items-center rounded-full bg-white text-xl">🛵</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold"><span className="font-black text-green-700">FREE</span> delivery on orders above {formatCurrency(freeDeliveryTarget)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-green-100">
              <div className="h-full rounded-full bg-green-600" style={{ width: `${freeDeliveryProgress}%` }} />
            </div>
          </div>
          <span className="text-xs font-black text-muted-foreground">{freeDeliveryRemaining ? `${formatCurrency(freeDeliveryRemaining)} more` : "Unlocked"}</span>
        </div>
      </section>
      ) : null}

      {cartCount ? (
        <Button asChild size="icon" className="fixed bottom-[6.3rem] right-5 z-40 size-16 rounded-full shadow-2xl md:hidden" aria-label="Open cart">
          <Link href="/cart">
            <ShoppingCart className="size-7" />
            <span className="absolute -right-1 -top-1 grid size-7 place-items-center rounded-full bg-white text-xs font-black text-primary shadow">{cartCount}</span>
          </Link>
        </Button>
      ) : null}
    </main>
  );
}

function DesktopPromoCard({
  tone,
  title,
  subtitle,
  code,
  image,
  href,
}: {
  tone: "green" | "orange" | "blue";
  title: string;
  subtitle: string;
  code: string;
  image: string;
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
        "group relative min-h-36 min-w-[22rem] flex-1 overflow-hidden rounded-xl bg-gradient-to-r p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl",
        tones[tone],
      )}
    >
      <div className="relative z-10 max-w-[55%]">
        <h2 className="text-3xl font-black leading-none">{title}</h2>
        <p className="mt-2 text-base font-semibold text-foreground">{subtitle}</p>
        <span className="mt-4 inline-flex rounded-md border border-current/30 bg-white/65 px-4 py-2 text-sm font-black">
          {code}
        </span>
      </div>
      <div className="absolute -right-7 bottom-0 h-32 w-48 overflow-hidden rounded-tl-full bg-white/45">
        <SafeImage
          src={image}
          alt=""
          fill
          fallbackSrc={IMAGE_FALLBACKS.food}
          sizes="220px"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}

function MobileSectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 pb-3 pt-5 md:pb-5 md:pt-2">
      <h2 className="text-[1.2rem] font-black tracking-normal md:text-2xl">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-black text-primary md:text-base">
        <span className="md:hidden">See all</span>
        <span className="hidden md:inline">View all</span>
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

function MobileRestaurantCard({ restaurant, priority = false }: { restaurant: Restaurant; priority?: boolean }) {
  const badge = restaurant.offerCodes?.[0] ?? (restaurant.deliveryFee === 0 ? "Free delivery" : restaurant.isOpen ? "Open" : "Preorder");
  return (
    <Link href={`/restaurant/${restaurant.slug}`} className="w-[14.5rem] shrink-0 overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl md:w-auto md:rounded-xl">
      <div className="relative h-28 overflow-hidden bg-muted md:h-36">
        <SafeImage
          src={restaurant.image}
          alt={restaurant.name}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          fallbackSrc={IMAGE_FALLBACKS.restaurant}
          sizes="250px"
          className="object-cover"
        />
        <Badge className="absolute left-3 top-3 rounded-md bg-green-600 text-white">{badge}</Badge>
        <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/24 text-white backdrop-blur">
          <Heart className="size-5" />
        </span>
      </div>
      <div className="space-y-2 p-3">
        <h3 className="truncate text-base font-black md:text-lg">{restaurant.name}</h3>
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground md:text-sm">
          <Star className="size-4 fill-green-600 text-green-600" />
          <span>{restaurant.rating || "New"}</span>
          <span className="text-primary">•</span>
          <span>{restaurant.deliveryTime || "25-30 min"}</span>
        </p>
        <p className="truncate text-xs font-semibold text-muted-foreground md:text-sm">
          {restaurant.deliveryFee ? formatCurrency(restaurant.deliveryFee) : "Free"} • {cuisineLabel(restaurant)}
        </p>
      </div>
    </Link>
  );
}

function PopularDishCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  return (
    <article className="grid min-h-24 w-[18rem] shrink-0 grid-cols-[5.25rem_1fr_auto] items-center gap-3 rounded-2xl border bg-card p-2 shadow-sm md:w-auto">
      <div className="relative size-[5.25rem] overflow-hidden rounded-xl bg-muted">
        <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="96px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-black leading-5">{item.name}</h3>
        <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">{item.category}</p>
        <p className="mt-3 text-lg font-black">{formatCurrency(item.price)}</p>
      </div>
      <Button type="button" size="icon" className="size-11 rounded-full" onClick={onAdd} aria-label={`Add ${item.name}`}>
        <Plus className="size-6" />
      </Button>
    </article>
  );
}

function cuisineLabel(restaurant: Restaurant) {
  return Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(", ") : restaurant.cuisine;
}

function offerTitle(offer: Offer) {
  if (offer.discountType === "free-delivery" || offer.offerType === "free-delivery") return "Free delivery";
  if (offer.discountType === "flat" || offer.offerType === "flat") return `${formatCurrency(offer.discount)} OFF`;
  return `${offer.discount}% OFF`;
}

function statusLabel(status: string, permission: string) {
  if (permission === "granted") return "GPS location active";
  if (permission === "denied") return "Using selected delivery area";
  return status || "Choose delivery location";
}
