"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Grid2X2, List, Minus, Plus, Search, SlidersHorizontal, Star, Timer } from "lucide-react";
import { FoodItemCard } from "@/components/commerce/food-item-card";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { RetryState, SkeletonGrid } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePublicCategories, usePublicCuisines, usePublicMenu, usePublicRestaurant, usePublicReviews } from "@/hooks/use-public-data";
import { useCartStore } from "@/lib/cart-store";
import type { MenuItem, Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type MenuDietFilter = "all" | "veg" | "nonveg";
type MenuViewMode = "grid" | "list";

export function CustomerMenuFlow({
  restaurant,
  restaurantSlug,
  source,
  offerCode,
  highlightItemId,
}: {
  restaurant?: Restaurant;
  restaurantSlug?: string;
  source?: string;
  offerCode?: string;
  highlightItemId?: string;
}) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dietFilter, setDietFilter] = useState<MenuDietFilter>("all");
  const [maxPrice, setMaxPrice] = useState("any");
  const [popularOnly, setPopularOnly] = useState(false);
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [spiceFilter, setSpiceFilter] = useState("all");
  const [mealFilter, setMealFilter] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [chefSpecialOnly, setChefSpecialOnly] = useState(false);
  const [comboOnly, setComboOnly] = useState(false);
  const [visibleState, setVisibleState] = useState({ key: "", count: 24 });
  const [viewMode, setViewMode] = useState<MenuViewMode>("grid");
  const debouncedQuery = useDebouncedValue(query, 160);
  const { restaurant: loadedRestaurant, status: restaurantStatus, retry: retryRestaurant } = usePublicRestaurant(restaurant?.slug ?? restaurantSlug ?? "");
  const activeRestaurant = restaurant ?? loadedRestaurant;
  const { items: menuItems, offers, status, retry } = usePublicMenu(activeRestaurant?.slug);
  const { reviews, summary: reviewSummary } = usePublicReviews(activeRestaurant?.slug);
  const { categories: masterCategories } = usePublicCategories();
  const { cuisines: masterCuisines } = usePublicCuisines();
  const applyOffer = useCartStore((state) => state.applyOffer);
  const activeOffer = offers.find((offer) => offer.code === offerCode);
  const scopedMenu = useMemo(
    () => activeRestaurant ? menuItems.filter((item) => item.restaurantSlug === activeRestaurant.slug) : [],
    [activeRestaurant, menuItems],
  );
  const isInstagram = source === "instagram";

  useEffect(() => {
    if (activeOffer) {
      applyOffer(activeOffer.code);
    }
  }, [activeOffer, applyOffer, offerCode]);

  useEffect(() => {
    const saved = window.localStorage.getItem("sarva-menu-view-mode");
    if ((saved !== "grid" && saved !== "list") || !window.matchMedia("(min-width: 640px)").matches) return;
    const id = window.setTimeout(() => setViewMode(saved), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sarva-menu-view-mode", viewMode);
  }, [viewMode]);

  const categories = useMemo(
    () => ["All", "Popular", ...orderedCategoryNames(scopedMenu, masterCategories)],
    [masterCategories, scopedMenu],
  );
  const filterKey = [category, debouncedQuery, dietFilter, maxPrice, popularOnly, cuisineFilter, spiceFilter, mealFilter, availableOnly, chefSpecialOnly, comboOnly].join("|");
  const activeVisibleCount = visibleState.key === filterKey ? visibleState.count : 24;
  const filterOptions = useMemo(() => buildFilterOptions(scopedMenu, masterCuisines), [masterCuisines, scopedMenu]);
  const visibleMenu = useMemo(() => scopedMenu.filter((item) => {
    const itemText = menuSearchText(item);
    const matchesCategory =
      category === "All" || (category === "Popular" ? Boolean(item.isPopular) : item.category === category);
    const matchesSearch = itemText.includes(debouncedQuery.trim().toLowerCase());
    const matchesDiet =
      dietFilter === "all" ||
      (dietFilter === "veg" ? item.isVeg || ["veg", "vegan", "jain"].includes(item.foodType ?? "") : !item.isVeg);
    const matchesPrice = maxPrice === "any" || item.price <= Number(maxPrice);
    const matchesPopular = !popularOnly || Boolean(item.isPopular);
    const matchesCuisine = cuisineFilter === "all" || menuItemHasCuisine(item, cuisineFilter);
    const matchesSpice = spiceFilter === "all" || item.spiceLevel === spiceFilter || Boolean(item.tags?.some((tag) => tag.toLowerCase() === spiceFilter));
    const matchesMeal = mealFilter === "all" || Boolean(item.tags?.some((tag) => tag.toLowerCase().includes(mealFilter)));
    const matchesAvailable = !availableOnly || !item.soldOut;
    const matchesChefSpecial = !chefSpecialOnly || Boolean(item.tags?.some((tag) => /chef|special/i.test(tag)));
    const matchesCombo = !comboOnly || Boolean(item.tags?.some((tag) => /combo|meal box|thali/i.test(tag)));
    return matchesCategory && matchesSearch && matchesDiet && matchesPrice && matchesPopular && matchesCuisine && matchesSpice && matchesMeal && matchesAvailable && matchesChefSpecial && matchesCombo;
  }), [availableOnly, category, chefSpecialOnly, comboOnly, cuisineFilter, debouncedQuery, dietFilter, maxPrice, mealFilter, popularOnly, scopedMenu, spiceFilter]);
  const renderedMenu = visibleMenu.slice(0, activeVisibleCount);
  const highlightedItem = highlightItemId
    ? scopedMenu.find((item) => item.id === highlightItemId)
    : undefined;

  if (restaurantStatus === "loading" || status === "loading") {
    return (
      <main className="container-page py-6">
        <SkeletonGrid count={6} />
      </main>
    );
  }

  if (restaurantStatus === "error") {
    return (
      <main className="container-page py-6">
        <RetryState onRetry={retryRestaurant} />
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

  if (!activeRestaurant) {
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

  return (
    <main className="space-y-5 pb-28 md:pb-8">
      <section className="relative min-h-[22rem] overflow-hidden text-white">
        <SafeImage src={activeRestaurant.image} alt={`${activeRestaurant.name} menu`} fill priority fallbackSrc={IMAGE_FALLBACKS.restaurant} sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/35 to-transparent" />
        <div className="container-page relative flex min-h-[22rem] flex-col justify-end py-5">
          <Badge className="w-fit rounded-full bg-white text-primary">{activeRestaurant.cuisine}</Badge>
          <h1 className="mt-3 text-4xl font-black leading-none sm:text-5xl">{activeRestaurant.name} menu</h1>
          <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
            <span className="inline-flex items-center gap-1">
              <Star className="size-4 fill-current" />
              {reviewSummary.ratingCount
                ? `${reviewSummary.averageRating} (${reviewSummary.ratingCount})`
                : activeRestaurant.rating > 0 ? activeRestaurant.rating : "New"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="size-4" />
              {activeRestaurant.deliveryTime || "Timing pending"}
            </span>
          </div>
        </div>
      </section>

      <section className="container-page space-y-4">
        {isInstagram && activeOffer ? (
          <Card className="mobile-premium-card border-accent bg-accent/8">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge variant="accent">
                  <Camera className="mr-1 size-3" aria-hidden="true" />
                  Reel offer applied
                </Badge>
                <p className="mt-2 text-sm font-bold">
                  {activeOffer.code} is ready. Continue without installing the app.
                </p>
              </div>
              <OfferBadge offer={activeOffer} />
            </CardContent>
          </Card>
        ) : null}

        {highlightedItem ? (
          <Card className="mobile-premium-card border-primary bg-primary/8">
            <CardContent className="p-4 text-sm font-bold text-primary">
              Opened from a food post: {highlightedItem.name}
            </CardContent>
          </Card>
        ) : null}

        {reviews.length ? (
          <Card className="customer-surface">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-primary">Verified reviews</p>
                  <h2 className="mt-1 text-xl font-black">{reviewSummary.averageRating} from {reviewSummary.ratingCount} orders</h2>
                </div>
                <Badge variant="success">
                  <Star className="mr-1 size-3 fill-current" />
                  Verified orders only
                </Badge>
              </div>
              <div className="customer-scroll flex gap-3 overflow-x-auto pb-1">
                {reviews.slice(0, 6).map((review) => (
                  <article key={review.id} className="min-w-[240px] rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-black">{review.customerName}</p>
                      <Badge variant="muted">
                        <Star className="mr-1 size-3 fill-current" />
                        {review.rating}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{review.comment}</p>
                    {review.ownerReply ? <p className="mt-2 rounded-md bg-muted p-2 text-xs font-semibold text-muted-foreground">Owner replied: {review.ownerReply.message}</p> : null}
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="glass-card sticky top-16 z-30 space-y-3 rounded-lg bg-card/92 p-3 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <Search className="ml-2 size-4 text-muted-foreground" />
            <Input
              className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
              placeholder="Search this menu"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button size="icon" variant="secondary" aria-label="Open menu filters" onClick={() => setFiltersOpen((value) => !value)}>
              <SlidersHorizontal className="size-4" />
            </Button>
            <div className="hidden rounded-md border bg-background p-1 sm:flex">
              <Button type="button" size="icon-sm" variant={viewMode === "grid" ? "default" : "ghost"} aria-label="Grid view" onClick={() => setViewMode("grid")}>
                <Grid2X2 className="size-4" />
              </Button>
              <Button type="button" size="icon-sm" variant={viewMode === "list" ? "default" : "ghost"} aria-label="Compact list view" onClick={() => setViewMode("list")}>
                <List className="size-4" />
              </Button>
            </div>
          </div>
          {filtersOpen ? (
            <div className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Food type
                <select className="h-10 rounded-md border bg-background px-3 text-sm font-bold" value={dietFilter} onChange={(event) => setDietFilter(event.target.value as MenuDietFilter)}>
                  <option value="all">All</option>
                  <option value="veg">Veg</option>
                  <option value="nonveg">Non-veg</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Cuisine
                <select className="h-10 rounded-md border bg-background px-3 text-sm font-bold" value={cuisineFilter} onChange={(event) => setCuisineFilter(event.target.value)}>
                  <option value="all">All cuisines</option>
                  {filterOptions.cuisines.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Spice
                <select className="h-10 rounded-md border bg-background px-3 text-sm font-bold" value={spiceFilter} onChange={(event) => setSpiceFilter(event.target.value)}>
                  <option value="all">Any spice</option>
                  {filterOptions.spiceLevels.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Meal time
                <select className="h-10 rounded-md border bg-background px-3 text-sm font-bold" value={mealFilter} onChange={(event) => setMealFilter(event.target.value)}>
                  <option value="all">Any time</option>
                  {filterOptions.mealTags.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Price
                <select className="h-10 rounded-md border bg-background px-3 text-sm font-bold" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}>
                  <option value="any">Any price</option>
                  <option value="150">Under ₹150</option>
                  <option value="300">Under ₹300</option>
                  <option value="500">Under ₹500</option>
                </select>
              </label>
              <div className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Highlights
                <Button type="button" variant={popularOnly ? "default" : "outline"} className="h-10" onClick={() => setPopularOnly((value) => !value)}>
                  Popular only
                </Button>
              </div>
              <div className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Chef special
                <Button type="button" variant={chefSpecialOnly ? "default" : "outline"} className="h-10" onClick={() => setChefSpecialOnly((value) => !value)}>
                  Chef special
                </Button>
              </div>
              <div className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Available now
                <Button type="button" variant={availableOnly ? "default" : "outline"} className="h-10" onClick={() => setAvailableOnly((value) => !value)}>
                  Available only
                </Button>
              </div>
              <div className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Combos
                <Button type="button" variant={comboOnly ? "default" : "outline"} className="h-10" onClick={() => setComboOnly((value) => !value)}>
                  Combos only
                </Button>
              </div>
            </div>
          ) : null}
          <div className="customer-scroll flex gap-2 overflow-x-auto pb-1" aria-label="Menu categories">
            {categories.map((item) => (
              <Button
                key={item}
                type="button"
                variant={item === category ? "default" : "outline"}
                size="sm"
                className="h-10 shrink-0 rounded-full px-4"
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        <section className={viewMode === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6" : "grid gap-3"}>
          {visibleMenu.length ? renderedMenu.map((item) => (
            viewMode === "grid" ? <FoodItemCard key={item.id} item={item} /> : <MenuListRow key={item.id} item={item} />
          )) : (
            <div className={viewMode === "grid" ? "col-span-2 md:col-span-3 xl:col-span-4 2xl:col-span-6" : undefined}>
              <EmptyStateCard
                title="No dishes match"
                description="Try a different food name, category, veg preference, or price filter."
                actionHref={null}
                retryLabel="Reset filters"
                onRetry={() => {
                  setCategory("All");
                  setQuery("");
                  setDietFilter("all");
                  setMaxPrice("any");
                  setPopularOnly(false);
                  setCuisineFilter("all");
                  setSpiceFilter("all");
                  setMealFilter("all");
                  setAvailableOnly(false);
                  setChefSpecialOnly(false);
                  setComboOnly(false);
                }}
              />
            </div>
          )}
        </section>
        {visibleMenu.length > renderedMenu.length ? (
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={() => setVisibleState({ key: filterKey, count: activeVisibleCount + 24 })}>
              Load more dishes
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function MenuListRow({ item }: { item: MenuItem }) {
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const quantity = useCartStore((state) => state.items.find((line) => line.id === item.id)?.quantity) ?? 0;

  return (
    <article className="grid gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:grid-cols-[96px_1fr_auto] sm:items-center">
      <div className="relative h-24 overflow-hidden rounded-xl bg-muted">
        <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="120px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Badge variant={item.isVeg ? "success" : "warning"}>{item.isVeg ? "Veg" : "Non-veg"}</Badge>
          {item.isPopular ? <Badge className="bg-secondary text-secondary-foreground">Bestseller</Badge> : null}
          {item.soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
        </div>
        <h3 className="mt-2 line-clamp-1 text-base font-black">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        <p className="mt-2 text-lg font-black">{formatCurrency(item.price)}</p>
      </div>
      {quantity > 0 ? (
        <div className="flex h-11 items-center rounded-md border bg-background shadow-sm">
          <Button variant="ghost" size="icon-sm" onClick={() => updateQuantity(item.id, quantity - 1)} aria-label={`Decrease ${item.name}`}>
            <Minus className="size-4" />
          </Button>
          <span className="w-8 text-center text-sm font-black">{quantity}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => updateQuantity(item.id, quantity + 1)} aria-label={`Increase ${item.name}`} disabled={item.soldOut}>
            <Plus className="size-4" />
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={() => addItem(item)} disabled={item.soldOut}>
          <Plus className="size-4" />
          {item.soldOut ? "Sold out" : "Add"}
        </Button>
      )}
    </article>
  );
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, value]);

  return debounced;
}

function menuSearchText(item: {
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  cuisineIds?: string[];
  tags?: string[];
  badges?: string[];
  searchKeywords?: string[];
  dietaryLabels?: string[];
  allergenLabels?: string[];
  foodType?: string;
}) {
  return [
    item.name,
    item.category,
    item.subcategory ?? "",
    item.description,
    item.foodType ?? "",
    ...(item.cuisineIds ?? []),
    ...(item.tags ?? []),
    ...(item.badges ?? []),
    ...(item.searchKeywords ?? []),
    ...(item.dietaryLabels ?? []),
    ...(item.allergenLabels ?? []),
  ].join(" ").toLowerCase();
}

function buildFilterOptions(items: MenuItem[], masterCuisines: Array<{ id: string; slug: string; name: string }>) {
  const cuisines = new Set<string>();
  const spiceLevels = new Set<string>();
  const mealTags = new Set<string>();

  for (const item of items) {
    item.cuisineIds?.forEach((cuisine) => cuisines.add(resolveCuisineName(cuisine, masterCuisines)));
    if (item.spiceLevel) spiceLevels.add(item.spiceLevel);
    item.tags?.forEach((tag) => {
      const value = tag.toLowerCase();
      if (["mild", "medium", "hot", "spicy"].includes(value)) spiceLevels.add(value);
      if (["breakfast", "lunch", "dinner", "snacks"].includes(value)) mealTags.add(value);
    });
  }

  return {
    cuisines: Array.from(cuisines).sort(),
    spiceLevels: Array.from(spiceLevels).sort(),
    mealTags: Array.from(mealTags).sort(),
  };
}

function orderedCategoryNames(items: MenuItem[], masterCategories: Array<{ id: string; slug: string; name: string; sortOrder: number }>) {
  const present = new Set(items.map((item) => item.category).filter(Boolean));
  const ordered = masterCategories
    .filter((category) => present.has(category.name) || present.has(category.id) || present.has(category.slug))
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((category) => category.name);
  const custom = Array.from(present)
    .filter((category) => !ordered.includes(category))
    .sort((first, second) => first.localeCompare(second));
  return [...ordered, ...custom];
}

function resolveCuisineName(value: string, masterCuisines: Array<{ id: string; slug: string; name: string }>) {
  const normalized = normalizeTaxonomy(value);
  return masterCuisines.find((item) =>
    [item.id, item.slug, item.name].some((candidate) => normalizeTaxonomy(candidate) === normalized),
  )?.name ?? titleCase(value);
}

function menuItemHasCuisine(item: MenuItem, cuisine: string) {
  const expected = normalizeTaxonomy(cuisine);
  return (item.cuisineIds ?? []).some((candidate) => normalizeTaxonomy(candidate) === expected)
    || menuSearchText(item).includes(expected);
}

function normalizeTaxonomy(value?: string) {
  return (value ?? "").toLowerCase().replace(/[-_]+/g, " ").trim();
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}
