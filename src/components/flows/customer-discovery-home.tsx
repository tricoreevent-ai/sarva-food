"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Grid2X2,
  Heart,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  User,
} from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { LocationHydrationBoundary } from "@/components/location/location-hydration-boundary";
import { LocationSuggestionList } from "@/components/location/location-suggestion-list";
import { RestaurantBannerCarousel } from "@/components/commerce/restaurant-banner-carousel";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerHomeLoading, RetryState } from "@/components/state/page-state";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCustomerData } from "@/hooks/use-customer-data";
import { useLocationCommerce } from "@/hooks/use-location-commerce";
import { usePublicCategories, usePublicMenu, usePublicRestaurants } from "@/hooks/use-public-data";
import { useAppStore } from "@/lib/app-store";
import { getCartSubtotal, useCartStore } from "@/lib/cart-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { resolveHomepageCategories } from "@/services/cms/cms-category-service";
import { getHomepageCmsItems, resolveCmsSettings } from "@/services/cms/cms-homepage-service";
import { customerFavoriteId, deleteCustomerFavoriteRestaurant, saveCustomerFavoriteRestaurant } from "@/services/customer-favorites-service";
import type { MenuItem, Restaurant } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const DIRECT_HOMEPAGE_TITLE = "Connect Directly with Restaurants";
const DIRECT_HOMEPAGE_SUBTITLE =
  "Skip the middlemen and order directly from local restaurants. Browse real-time menus, access exclusive restaurant offers, schedule deliveries, and communicate directly with restaurant owners for a faster, more transparent food ordering experience.";
const DIRECT_HOMEPAGE_HEADING = "Order Directly From Restaurants Near You";
const DIRECT_HOMEPAGE_SUPPORT =
  "Skip the aggregators and connect directly with restaurant owners for better prices, exclusive offers, and a more personal food ordering experience.";
const DIRECT_HOMEPAGE_TAGLINE = "Direct Restaurant. Direct Customer. No Third Party.";
const STALE_DEFAULT_HOME_TITLES = new Set(["craving something delicious?"]);
const STALE_DEFAULT_HOME_SUBTITLES = new Set([
  "order from verified nearby restaurants with live menus, quick delivery, and direct restaurant support.",
]);
const CUSTOMER_HERO_FALLBACK_IMAGE = "/images/customer-hero-restaurant.svg";
const LOGO_IMAGE_PATTERNS = [
  "/brand/nammude-logo",
  "/icons/nammude-",
  "/_next/image?url=%2fbrand%2fnammude-logo",
  "/_next/image?url=%2ficons%2fnammude-",
];

export function CustomerDiscoveryHome() {
  const router = useRouter();
  const { restaurants, status: restaurantsStatus, retry: retryRestaurants } = usePublicRestaurants();
  const auth = useAuthUser();
  const customer = useCustomerData(auth.user?.uid);
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
  const cartSubtotal = getCartSubtotal(cartItems);
  const customerDisplayName = customer.profile?.displayName || (auth.profile?.role === "customer" ? auth.profile?.displayName : "") || auth.user?.displayName || "";
  const customerFirstName = customerDisplayName.trim().split(/\s+/)[0] ?? "";
  const heroRestaurant = nearbyRestaurants[0] ?? restaurants[0];
  const { items: menuItems } = usePublicMenu(heroRestaurant?.slug);
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
  const savedRestaurantMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const saved of customer.savedRestaurants) {
      if (saved.slug) map.set(saved.slug, saved.id);
      if (saved.restaurantId) map.set(saved.restaurantId, saved.id);
    }
    return map;
  }, [customer.savedRestaurants]);
  const favoriteRestaurants = useMemo(() => {
    const seen = new Set<string>();
    return customer.savedRestaurants
      .map((saved) => restaurants.find((restaurant) => restaurant.slug === saved.slug || restaurant.id === saved.restaurantId))
      .filter((restaurant): restaurant is Restaurant => {
        if (!restaurant || seen.has(restaurant.id)) return false;
        seen.add(restaurant.id);
        return true;
      });
  }, [customer.savedRestaurants, restaurants]);

  const popularItems = useMemo(() => {
    const nearbySlugs = new Set(recommendedRestaurants.map((restaurant) => restaurant.slug));
    const scoped = menuItems
      .filter((item) => nearbySlugs.size ? nearbySlugs.has(item.restaurantSlug) : true)
      .filter((item) => (item.orderCount ?? 0) > 0)
      .sort((first, second) => (second.orderCount ?? 0) - (first.orderCount ?? 0));
    return Array.from(new Map(scoped.map((item) => [item.id, item])).values()).slice(0, 8);
  }, [menuItems, recommendedRestaurants]);
  const featuredItems = useMemo(() => {
    return menuItems
      .filter((item) => item.featuredEnabled)
      .sort((first, second) => (first.featuredOrder ?? 999) - (second.featuredOrder ?? 999) || (second.orderCount ?? 0) - (first.orderCount ?? 0))
      .slice(0, 8);
  }, [menuItems]);

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

  async function handleFavoriteToggle(restaurant: Restaurant) {
    const customerId = auth.user?.uid;
    if (!customerId) {
      router.push(`/login?next=${encodeURIComponent("/")}`);
      return;
    }

    const favoriteId = savedRestaurantMap.get(restaurant.slug) ?? savedRestaurantMap.get(restaurant.id) ?? customerFavoriteId(customerId, restaurant);
    const alreadySaved = savedRestaurantMap.has(restaurant.slug) || savedRestaurantMap.has(restaurant.id);
    try {
      if (alreadySaved) {
        await deleteCustomerFavoriteRestaurant(favoriteId);
        notifyCustomerHome("success", `${restaurant.name} removed from favorites.`);
      } else {
        await saveCustomerFavoriteRestaurant(customerId, restaurant);
        notifyCustomerHome("success", `${restaurant.name} saved to favorites.`);
      }
      customer.retry();
    } catch (error) {
      console.error("[customer/home] favorite update failed", error);
      notifyCustomerHome("error", "Could not update favorite. Please try again.");
    }
  }

  if (restaurantsStatus === "loading") {
    return <CustomerHomeLoading />;
  }

  if (restaurantsStatus === "error") {
    return (
      <main className="container-page py-6">
        <RetryState
          title="No restaurants available in this area"
          description="We could not find restaurants for this location yet. Choose another location or check back later."
          onRetry={retryRestaurants}
        />
      </main>
    );
  }

  if (!heroRestaurant) {
    return (
      <main className="container-page py-6">
        <EmptyStateCard
          title="No restaurants available in this area"
          description="Choose another location or check back later. Restaurants will appear here as soon as they are ready to accept orders."
          actionHref={null}
        />
      </main>
    );
  }

  const freeDeliveryTarget = heroRestaurant.deliverySettings?.freeDeliveryAbove;
  const freeDeliveryProgress = freeDeliveryTarget ? Math.min(100, Math.round((cartSubtotal / freeDeliveryTarget) * 100)) : 0;
  const freeDeliveryRemaining = freeDeliveryTarget ? Math.max(0, freeDeliveryTarget - cartSubtotal) : 0;
  const homepageTitle = resolveDirectHomepageTitle(cmsSettings.homepage?.title);
  const homepageSubtitle = resolveDirectHomepageSubtitle(cmsSettings.homepage?.subtitle);
  const heroImage = resolveCustomerHeroImage(cmsSettings.homepage?.backgroundImage);

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
          <p className="min-w-0 text-sm font-black text-primary">
            {DIRECT_HOMEPAGE_TAGLINE}
          </p>
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
            <p className="text-[0.98rem] font-black tracking-normal">{customerFirstName ? `Good Morning, ${customerFirstName}!` : "Good Morning!"}</p>
            <p className="mt-2 max-w-[13.5rem] text-xs font-black uppercase tracking-normal text-primary">{DIRECT_HOMEPAGE_TAGLINE}</p>
            <h1 className="mt-2 max-w-[15.5rem] text-[1.72rem] font-black leading-[1.06] tracking-normal">
              {DIRECT_HOMEPAGE_HEADING}
            </h1>
          </div>
          <div className="relative h-32 overflow-visible">
            <div className="absolute -right-10 bottom-0 size-32 overflow-hidden rounded-full bg-orange-100 shadow-2xl">
              <SafeImage
                src={heroImage}
                alt="Restaurant ordering illustration"
                fill
                priority
                fallbackSrc={CUSTOMER_HERO_FALLBACK_IMAGE}
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
              id="customer-home-search"
              name="customerHomeSearch"
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
              {cmsSettings.homepage?.visible !== false && homepageTitle ? (
                <p className="mb-4 text-sm font-black uppercase tracking-normal text-primary">{DIRECT_HOMEPAGE_TAGLINE}</p>
              ) : null}
              {cmsSettings.homepage?.visible !== false && homepageTitle ? (
                <h1 className="text-5xl font-black leading-[1.05] tracking-normal xl:text-[3.65rem]">
                  {homepageTitle}
                </h1>
              ) : null}
              {cmsSettings.homepage?.visible !== false && homepageSubtitle ? (
                <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">
                  {homepageSubtitle}
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
                  src={heroImage}
                  alt="Restaurant ordering illustration"
                  fill
                  loading="eager"
                  fetchPriority="high"
                  fallbackSrc={CUSTOMER_HERO_FALLBACK_IMAGE}
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

      <section className="container-page py-5 md:py-7">
        <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-primary">Why Choose Nammude?</p>
            <h2 className="mt-2 text-2xl font-black tracking-normal md:text-3xl">Food Ordering Without Middlemen</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{DIRECT_HOMEPAGE_SUPPORT}</p>
          </div>
          <p className="text-sm font-semibold leading-7 text-muted-foreground md:text-base md:leading-8">
            Nammude is a direct-to-customer restaurant platform where customers connect directly with restaurant owners. Discover local restaurants, access genuine offers, view real-time menus, and place orders without relying on third-party aggregators. Better communication, better pricing, and a more transparent food ordering experience.
          </p>
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
            className="group flex w-[4.25rem] shrink-0 flex-col items-center gap-2 text-center"
          >
            <span className="grid size-14 place-items-center overflow-hidden rounded-full bg-white shadow-md transition duration-200 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-xl">
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
          className="group flex h-[5.25rem] min-w-24 flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-primary/5 text-center text-primary shadow-sm transition duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl"
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
            className="group flex h-[5.25rem] min-w-24 flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-white text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl"
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

      {favoriteRestaurants.length > 3 ? (
        <>
          <MobileSectionHeader title="Your favorite restaurants" href="/profile?tab=saved" />
          <section className="customer-scroll container-page flex w-full gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
            {favoriteRestaurants.slice(0, 8).map((restaurant) => (
              <MemoMobileRestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                saved
                onFavorite={() => void handleFavoriteToggle(restaurant)}
              />
            ))}
          </section>
        </>
      ) : null}

      {cmsSettings.sections?.featuredRestaurantsVisible !== false ? (
        <>
          <MobileSectionHeader title={cmsSettings.sections?.recommendedTitle || "Recommended for you"} href="/restaurants" />
          <section className="customer-scroll container-page flex w-full gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
            {recommendedRestaurants.slice(0, 8).map((restaurant) => (
              <MemoMobileRestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                saved={savedRestaurantMap.has(restaurant.slug) || savedRestaurantMap.has(restaurant.id)}
                onFavorite={() => void handleFavoriteToggle(restaurant)}
              />
            ))}
          </section>
        </>
      ) : null}

      {featuredItems.length ? (
        <>
          <MobileSectionHeader title="Featured menu items" href={`/restaurant/${heroRestaurant.slug}/menu`} />
          <section className="customer-scroll container-page flex w-full gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
            {featuredItems.map((item) => (
              <PopularDishCard key={item.id} item={item} onAdd={() => addItem(item)} />
            ))}
          </section>
        </>
      ) : null}

      {cmsSettings.sections?.popularItemsVisible !== false && popularItems.length ? (
        <>
          <MobileSectionHeader title={cmsSettings.sections?.popularTitle || "What's popular"} href={`/restaurant/${heroRestaurant.slug}/menu`} />
          <section className="customer-scroll container-page flex w-full gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
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
    </main>
  );
}

function MobileSectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="container-page flex w-full items-center justify-between pb-3 pt-5 md:pb-5 md:pt-2">
      <h2 className="text-[1.2rem] font-black tracking-normal md:text-2xl">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-black text-primary md:text-base">
        <span className="md:hidden">See all</span>
        <span className="hidden md:inline">View all</span>
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

function MobileRestaurantCard({
  restaurant,
  saved = false,
  onFavorite,
}: {
  restaurant: Restaurant;
  saved?: boolean;
  onFavorite?: () => void;
}) {
  const badge = restaurant.deliveryFee === 0 ? "Free delivery" : restaurant.isOpen ? "Open" : "Preorder";
  const images = restaurantListingImages(restaurant);
  return (
    <article className="content-visibility-auto w-[14.5rem] shrink-0 overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl md:w-auto md:rounded-xl">
      <div className="relative h-28 overflow-hidden bg-muted md:h-36">
        <Link href={`/restaurant/${restaurant.slug}`} prefetch={false} className="relative block h-full">
          <RestaurantBannerCarousel images={images} alt={restaurant.name} sizes="250px" intervalMs={5200} />
        </Link>
        <Badge className="absolute left-3 top-3 rounded-md bg-green-600 text-white">{badge}</Badge>
        <button
          type="button"
          onClick={onFavorite}
          aria-label={saved ? `Remove ${restaurant.name} from favorites` : `Save ${restaurant.name} to favorites`}
          aria-pressed={saved}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/24 text-white backdrop-blur transition hover:bg-primary"
        >
          <Heart className={cn("size-5", saved && "fill-current")} />
        </button>
      </div>
      <Link href={`/restaurant/${restaurant.slug}`} prefetch={false} className="block space-y-2 p-3">
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
      </Link>
    </article>
  );
}

function restaurantListingImages(restaurant: Restaurant) {
  const images = restaurant.activeBannerThumbnails?.length ? restaurant.activeBannerThumbnails : restaurant.thumbnailImages ?? [];
  const unique = Array.from(new Set(images.filter(Boolean))).slice(0, 5);
  return unique.length ? unique : [IMAGE_FALLBACKS.restaurant];
}

const MemoMobileRestaurantCard = memo(MobileRestaurantCard);
MemoMobileRestaurantCard.displayName = "MemoMobileRestaurantCard";

function PopularDishCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  return (
    <article className="render-contain grid min-h-24 w-[18rem] shrink-0 grid-cols-[5.25rem_1fr_auto] items-center gap-3 rounded-2xl border bg-card p-2 shadow-sm md:w-auto">
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

function statusLabel(status: string, permission: string) {
  if (permission === "granted") return "GPS location active";
  if (permission === "denied") return "Using selected delivery area";
  return status || "Choose delivery location";
}

function notifyCustomerHome(kind: "success" | "error", message: string) {
  void import("react-hot-toast").then(({ default: toast }) => {
    toast[kind](message);
  });
}

function resolveDirectHomepageTitle(value?: string) {
  const normalized = value?.trim();
  if (!normalized || STALE_DEFAULT_HOME_TITLES.has(normalized.toLowerCase())) return DIRECT_HOMEPAGE_TITLE;
  return normalized;
}

function resolveDirectHomepageSubtitle(value?: string) {
  const normalized = value?.trim();
  if (!normalized || STALE_DEFAULT_HOME_SUBTITLES.has(normalized.toLowerCase())) return DIRECT_HOMEPAGE_SUBTITLE;
  return normalized;
}

function resolveCustomerHeroImage(value?: string) {
  const image = value?.trim() ?? "";
  if (!image) return CUSTOMER_HERO_FALLBACK_IMAGE;
  const normalized = image.toLowerCase();
  return LOGO_IMAGE_PATTERNS.some((pattern) => normalized.includes(pattern)) ? CUSTOMER_HERO_FALLBACK_IMAGE : image;
}
