"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, LocateFixed, MapPin, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { RestaurantCard } from "@/components/commerce/restaurant-card";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { LocationHydrationBoundary } from "@/components/location/location-hydration-boundary";
import { LocationSuggestionList } from "@/components/location/location-suggestion-list";
import { RetryState } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocationCommerce } from "@/hooks/use-location-commerce";
import { usePublicRestaurants } from "@/hooks/use-public-data";
import { formatCurrency } from "@/lib/utils";
import type { Restaurant } from "@/lib/types";

const baseChips = ["All", "Top rated", "Fast delivery", "Offers"];
const priceFilters = [
  { label: "Any price", value: "any" },
  { label: "Under ₹300", value: "300" },
  { label: "Under ₹600", value: "600" },
  { label: "Under ₹1,000", value: "1000" },
];
const ratingFilters = [
  { label: "Any rating", value: "0" },
  { label: "4.0+", value: "4" },
  { label: "4.3+", value: "4.3" },
  { label: "4.5+", value: "4.5" },
];
const etaFilters = [
  { label: "Any ETA", value: "any" },
  { label: "Under 25 min", value: "25" },
  { label: "Under 35 min", value: "35" },
  { label: "Under 45 min", value: "45" },
];
type DietFilter = "all" | "veg" | "nonveg";
type SortMode = "distance" | "rating" | "eta";

export function RestaurantBrowserFlow() {
  const { restaurants, status: restaurantsStatus, retry } = usePublicRestaurants();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResultsOpen, setLocationResultsOpen] = useState(false);
  const [activeChip, setActiveChip] = useState("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [priceFilter, setPriceFilter] = useState("any");
  const [ratingFilter, setRatingFilter] = useState("0");
  const [etaFilter, setEtaFilter] = useState("any");
  const [offerOnly, setOfferOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("distance");
  const debouncedQuery = useDebouncedValue(query, 180);
  const {
    location,
    locationRestaurants,
    nearbyRestaurants,
    suggestions,
    status,
    detecting,
    hydrated,
    permission,
    detectLocation,
    searchPlaces,
    selectLocation,
  } = useLocationCommerce(restaurants);
  const chips = useMemo(() => {
    const cuisineChips = Array.from(new Set(restaurants.flatMap((restaurant) => [
      restaurant.cuisine,
      ...restaurant.tags,
      ...(restaurant.categoryTags ?? []),
    ]).map((item) => item.trim()).filter(Boolean))).slice(0, 8);
    return [...baseChips, ...cuisineChips.filter((item) => !baseChips.includes(item))];
  }, [restaurants]);
  const visibleSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return suggestions.filter((item) => {
      const key = `${item.placeId ?? item.address}-${item.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }, [suggestions]);

  function handleLocationSelect(nextLocation: typeof visibleSuggestions[number]) {
    selectLocation(nextLocation);
    setLocationQuery(nextLocation.label);
    setLocationResultsOpen(false);
  }

  const activeFiltersCount = [
    dietFilter !== "all",
    priceFilter !== "any",
    ratingFilter !== "0",
    etaFilter !== "any",
    offerOnly,
    !nearbyOnly,
    activeChip !== "All",
  ].filter(Boolean).length;

  const results = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    const source = nearbyOnly ? nearbyRestaurants : locationRestaurants;
    const maxPrice = priceFilter === "any" ? Infinity : Number(priceFilter);
    const minRating = Number(ratingFilter);
    const maxEta = etaFilter === "any" ? Infinity : Number(etaFilter);

    return source
      .filter((restaurant) => {
        if (!matchesSearch(restaurant, normalizedQuery)) return false;
        if (!matchesChip(restaurant, activeChip)) return false;
        if (!matchesDiet(restaurant, dietFilter)) return false;
        if ((restaurant.priceForTwo || restaurant.maxPrice || 0) > maxPrice) return false;
        if (restaurant.rating < minRating) return false;
        if (etaMinutes(restaurant) > maxEta) return false;
        if (offerOnly && !hasOffer(restaurant)) return false;
        return true;
      })
      .sort((first, second) => {
        if (sortMode === "rating") {
          return second.rating - first.rating || (second.reviewCount ?? 0) - (first.reviewCount ?? 0);
        }
        if (sortMode === "eta") {
          return etaMinutes(first) - etaMinutes(second) || (first.distanceKm ?? 999) - (second.distanceKm ?? 999);
        }
        return (first.distanceKm ?? 999) - (second.distanceKm ?? 999) || binnedDeliveryFee(first) - binnedDeliveryFee(second);
      });
  }, [
    activeChip,
    debouncedQuery,
    dietFilter,
    etaFilter,
    locationRestaurants,
    nearbyOnly,
    nearbyRestaurants,
    offerOnly,
    priceFilter,
    ratingFilter,
    sortMode,
  ]);

  if (restaurantsStatus === "error") {
    return (
      <main className="container-page py-6">
        <RetryState onRetry={retry} />
      </main>
    );
  }

  if (restaurantsStatus === "success" && !restaurants.length) {
    return (
      <main className="container-page py-6">
        <EmptyStateCard
          title="No restaurants are available"
          description="Approved restaurants from Firestore will appear here for customers."
          actionHref={null}
        />
      </main>
    );
  }

  return (
    <main className="space-y-6 pb-6">
      <section className="customer-hero-gradient text-white">
        <div className="container-page space-y-5 py-6 sm:py-9">
          <Badge className="rounded-full bg-white text-primary">
            <Sparkles className="mr-1 size-3" />
            Fresh picks near <LocationHydrationBoundary>{location.label}</LocationHydrationBoundary>
          </Badge>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full bg-white/16 text-white ring-1 ring-white/24">
              <MapPin className="mr-1 size-3" />
              <LocationHydrationBoundary>{location.address}</LocationHydrationBoundary>
            </Badge>
            <Badge className="rounded-full bg-white/16 text-white ring-1 ring-white/24">
              {permission === "granted" ? "GPS on" : permission === "denied" ? "Manual location" : "Location pending"}
            </Badge>
          </div>
          <div>
            <h1 className="text-4xl font-black sm:text-5xl">Food delivery around you.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/86">
              Change location, filter cuisine, and jump straight into nearby ordering.
            </p>
          </div>
          <div className="glass-card space-y-3 rounded-lg bg-white/94 p-3 text-foreground shadow-2xl">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-h-12 flex-1 items-center gap-2 rounded-md bg-muted px-3">
                <MapPin className="size-5 text-primary" />
                <Input
                  className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                  placeholder="Search delivery area"
                  value={locationQuery}
                  onChange={(event) => {
                    setLocationQuery(event.target.value);
                    setLocationResultsOpen(Boolean(event.target.value.trim()));
                    searchPlaces(event.target.value);
                  }}
                  onFocus={() => setLocationResultsOpen(Boolean(locationQuery.trim()))}
                />
              </div>
              <Button
                type="button"
                className="h-12 w-full sm:w-48"
                onClick={() => {
                  setLocationResultsOpen(false);
                  detectLocation();
                }}
                disabled={detecting}
              >
                <LocateFixed className="size-4" />
                {detecting ? "Finding" : permission === "granted" ? "Refresh location" : "Use current location"}
              </Button>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">{hydrated ? status : "Choose delivery location"}</p>
            {locationResultsOpen ? (
              <LocationSuggestionList locations={visibleSuggestions} onSelect={handleLocationSelect} />
            ) : null}
          </div>
          <div className="glass-card flex items-center gap-2 rounded-lg bg-white/94 p-2 text-foreground shadow-xl">
            <Search className="ml-2 size-5 text-muted-foreground" />
            <Input
              className="h-12 border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
              placeholder="Try coastal curry, kebab, coffee"
              aria-label="Search restaurants"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button size="icon" variant="secondary" aria-label="Open filters" onClick={() => setFiltersOpen((value) => !value)}>
              <SlidersHorizontal className="size-5" />
            </Button>
          </div>
          {filtersOpen ? (
            <div className="glass-card grid gap-3 rounded-lg bg-white/94 p-3 text-foreground shadow-xl md:grid-cols-2 lg:grid-cols-4">
              <FilterGroup label="Food type">
                <SegmentedControl
                  value={dietFilter}
                  options={[
                    { label: "All", value: "all" },
                    { label: "Veg", value: "veg" },
                    { label: "Non-veg", value: "nonveg" },
                  ]}
                  onChange={(value) => setDietFilter(value as DietFilter)}
                />
              </FilterGroup>
              <FilterGroup label="Price for two">
                <select className="h-10 rounded-md border bg-background px-3 text-sm font-bold" value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
                  {priceFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="Rating">
                <select className="h-10 rounded-md border bg-background px-3 text-sm font-bold" value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}>
                  {ratingFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="Delivery time">
                <select className="h-10 rounded-md border bg-background px-3 text-sm font-bold" value={etaFilter} onChange={(event) => setEtaFilter(event.target.value)}>
                  {etaFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="Discovery">
                <div className="grid grid-cols-2 gap-2">
                  <ToggleButton active={offerOnly} onClick={() => setOfferOnly((value) => !value)}>Offers</ToggleButton>
                  <ToggleButton active={nearbyOnly} onClick={() => setNearbyOnly((value) => !value)}>Nearby</ToggleButton>
                </div>
              </FilterGroup>
              <FilterGroup label="Sort">
                <SegmentedControl
                  value={sortMode}
                  options={[
                    { label: "Distance", value: "distance" },
                    { label: "Rating", value: "rating" },
                    { label: "ETA", value: "eta" },
                  ]}
                  onChange={(value) => setSortMode(value as SortMode)}
                />
              </FilterGroup>
              <div className="flex items-end md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-background"
                  onClick={() => {
                    setDietFilter("all");
                    setPriceFilter("any");
                    setRatingFilter("0");
                    setEtaFilter("any");
                    setOfferOnly(false);
                    setNearbyOnly(true);
                    setActiveChip("All");
                    setSortMode("distance");
                  }}
                >
                  Reset filters{activeFiltersCount ? ` (${activeFiltersCount})` : ""}
                </Button>
              </div>
            </div>
          ) : null}
          <div className="customer-scroll flex gap-2 overflow-x-auto">
            {chips.map((chip) => (
              <Button
                key={chip}
                type="button"
                size="sm"
                variant={activeChip === chip ? "secondary" : "outline"}
                className="shrink-0 border-white/35 bg-white/12 text-white hover:bg-white hover:text-primary data-[active=true]:bg-white data-[active=true]:text-primary"
                data-active={activeChip === chip}
                onClick={() => {
                  setActiveChip(chip);
                  if (!["All", "Top rated", "Fast delivery", "Offers"].includes(chip)) {
                    setQuery(chip);
                  }
                }}
              >
                <Filter className="size-4" />
                {chip}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-primary">Delivery partners online</p>
            <h2 className="mt-1 text-2xl font-black">
              {results.length} {nearbyOnly ? "restaurants deliver here" : "restaurants around this area"}
            </h2>
          </div>
          <Button variant="ghost" onClick={() => setSortMode("rating")}>
            Sort by rating
          </Button>
        </div>

        {restaurantsStatus === "loading" ? (
          <section aria-label="Loading restaurants" className="grid gap-4 md:grid-cols-3">
            <Skeleton className="shimmer h-72 rounded-lg" />
            <Skeleton className="shimmer h-72 rounded-lg" />
            <Skeleton className="shimmer hidden h-72 rounded-lg md:block" />
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
            {!results.length ? (
              <div className="customer-surface rounded-lg p-8 text-center text-sm text-muted-foreground lg:col-span-3">
                No restaurants match those filters. Try biryani, cafe, coastal, kebab, or clear one filter.
              </div>
            ) : null}
          </section>
        )}
      </section>
    </main>
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

function matchesSearch(restaurant: Restaurant, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  return searchText(restaurant).includes(normalizedQuery);
}

function matchesChip(restaurant: Restaurant, chip: string) {
  if (chip === "All") return true;
  if (chip === "Top rated") return restaurant.rating >= 4.3;
  if (chip === "Fast delivery") return etaMinutes(restaurant) <= 30;
  if (chip === "Offers") return hasOffer(restaurant);
  return searchText(restaurant).includes(chip.toLowerCase());
}

function matchesDiet(restaurant: Restaurant, filter: DietFilter) {
  if (filter === "all") return true;
  const foodTypes = restaurant.foodTypes ?? [];
  if (filter === "veg") return foodTypes.includes("veg") || foodTypes.includes("vegan") || foodTypes.includes("jain");
  return foodTypes.includes("nonveg") || foodTypes.includes("egg");
}

function hasOffer(restaurant: Restaurant) {
  return Boolean(
    restaurant.offerCodes?.length ||
    restaurant.tags.some((tag) => tag.toLowerCase().includes("offer")),
  );
}

function etaMinutes(restaurant: Restaurant) {
  if (typeof restaurant.etaMinutes === "number") return restaurant.etaMinutes;
  const parsed = Number.parseInt(restaurant.deliveryTime, 10);
  return Number.isFinite(parsed) ? parsed : 999;
}

function binnedDeliveryFee(restaurant: Restaurant) {
  return typeof restaurant.deliveryFee === "number" ? restaurant.deliveryFee : 999;
}

function searchText(restaurant: Restaurant) {
  return [
    restaurant.name,
    restaurant.cuisine,
    restaurant.location,
    ...restaurant.tags,
    ...(restaurant.popularItems ?? []),
    ...(restaurant.categoryTags ?? []),
    ...(restaurant.offerCodes ?? []),
    ...(restaurant.searchKeywords ?? []),
    restaurant.priceForTwo ? `${formatCurrency(restaurant.priceForTwo)} for two` : "",
  ].join(" ").toLowerCase();
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`rounded px-2 py-2 text-xs font-black ${value === option.value ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`h-10 rounded-md border px-3 text-sm font-black ${active ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
