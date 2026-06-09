"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listenPublicCategories,
  listenPublicCuisines,
  listenPublicMenu,
  listenPublicOffers,
  listenPublicRestaurant,
  listenPublicRestaurants,
  listenPublicReviews,
  type PublicDataStatus,
} from "@/services/public-data-service";
import { cacheReport, getCachedReport } from "@/lib/offline/offline-storage";
import { useAppStore } from "@/lib/app-store";
import type { AppCategory, AppCuisine, MenuItem, Offer, Restaurant, Review } from "@/lib/types";
import { isOfferActive, sortOffers } from "@/lib/offer-engine";

const PUBLIC_LOAD_TIMEOUT_MS = 1500;
const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_RESTAURANTS_CACHE_KEY = "sarva-public-restaurants-cache:v3";
const PUBLIC_MENU_CACHE_PREFIX = "sarva-public-menu-cache:v7:";
const PUBLIC_CUISINES_CACHE_KEY = "sarva-public-cuisines-cache:v1";
const LEGACY_SEEDED_PUBLIC_MENU_IDS = new Set([
  "cafe-al-arab-thanisandra-chicken-shawarma-roll",
  "cafe-al-arab-thanisandra-alfaham-half",
  "cafe-al-arab-thanisandra-chicken-mandi",
  "cafe-al-arab-thanisandra-falafel-pita",
  "menu-chicken-shawarma-roll",
  "menu-al-faham-half",
  "menu-chicken-mandi",
  "menu-falafel-pita",
]);

function readCache<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in private mode or under quota pressure.
  }
  void cacheReport(key, value, PUBLIC_CACHE_TTL_MS).catch(() => undefined);
}

async function readIndexedCache<T>(key: string, fallback: T): Promise<T> {
  try {
    const record = await getCachedReport<T>(key);
    return record?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export function usePublicRestaurants(options: { preloadPrimaryMenu?: boolean } = {}) {
  const preloadPrimaryMenu = options.preloadPrimaryMenu ?? false;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [status, setStatus] = useState<PublicDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [loadingForMs, setLoadingForMs] = useState(0);
  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const startedAt = performance.now();
    const cachedTimerId = window.setTimeout(() => {
      const cached = readCache<Restaurant[]>(PUBLIC_RESTAURANTS_CACHE_KEY, []);
      if (active && cached.length) {
        window.clearTimeout(timeoutId);
        setRestaurants(cached);
        setStatus("success");
        setError(null);
      }
      void readIndexedCache<Restaurant[]>(PUBLIC_RESTAURANTS_CACHE_KEY, []).then((indexed) => {
        if (active && indexed.length) {
          window.clearTimeout(timeoutId);
          setRestaurants(indexed);
          setStatus("success");
          setError(null);
        }
      });
    }, 75);
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setLoadingForMs(Math.round(performance.now() - startedAt));
      setStatus("error");
      setError("Restaurant data is taking longer than expected.");
    }, PUBLIC_LOAD_TIMEOUT_MS);

    const unsubscribe = listenPublicRestaurants(
      (items) => {
        if (!active) return;
        window.clearTimeout(timeoutId);
        window.clearTimeout(cachedTimerId);
        setRestaurants(items);
        writeCache(PUBLIC_RESTAURANTS_CACHE_KEY, items);
        setLoadingForMs(Math.round(performance.now() - startedAt));
        setError(null);
        setStatus("success");
      },
      {
        preloadPrimaryMenu,
        onError: () => {
          if (!active) return;
          window.clearTimeout(timeoutId);
          window.clearTimeout(cachedTimerId);
          setLoadingForMs(Math.round(performance.now() - startedAt));
          setError("Restaurants are temporarily unavailable.");
          setStatus("error");
        },
      },
    );

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      window.clearTimeout(cachedTimerId);
      unsubscribe();
    };
  }, [preloadPrimaryMenu, version]);

  return { restaurants, status, error, retry, loadingForMs };
}

export function usePublicCategories() {
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [status, setStatus] = useState<PublicDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setStatus("error");
      setError("Categories are taking longer than expected.");
    }, PUBLIC_LOAD_TIMEOUT_MS);

    const unsubscribe = listenPublicCategories((items) => {
      if (!active) return;
      window.clearTimeout(timeoutId);
      setCategories(items);
      setError(null);
      setStatus("success");
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [version]);

  return { categories, status, error, retry };
}

export function usePublicCuisines() {
  const [cuisines, setCuisines] = useState<AppCuisine[]>([]);
  const [status, setStatus] = useState<PublicDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const cachedTimerId = window.setTimeout(() => {
      const cached = readCache<AppCuisine[]>(PUBLIC_CUISINES_CACHE_KEY, []);
      if (active && cached.length) {
        window.clearTimeout(timeoutId);
        setCuisines(cached);
        setStatus("success");
        setError(null);
      }
    }, 75);
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setStatus("error");
      setError("Cuisine types are taking longer than expected.");
    }, PUBLIC_LOAD_TIMEOUT_MS);

    const unsubscribe = listenPublicCuisines((items) => {
      if (!active) return;
      window.clearTimeout(timeoutId);
      window.clearTimeout(cachedTimerId);
      setCuisines(items);
      writeCache(PUBLIC_CUISINES_CACHE_KEY, items);
      setError(null);
      setStatus("success");
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      window.clearTimeout(cachedTimerId);
      unsubscribe();
    };
  }, [version]);

  return { cuisines, status, error, retry };
}

export function usePublicRestaurant(slug: string) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [status, setStatus] = useState<PublicDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [loadingForMs, setLoadingForMs] = useState(0);
  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!slug) {
      const id = window.setTimeout(() => {
        setRestaurant(null);
        setStatus("idle");
      }, 0);
      return () => window.clearTimeout(id);
    }

    let active = true;
    const startedAt = performance.now();
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setLoadingForMs(Math.round(performance.now() - startedAt));
      setStatus("error");
      setError("Restaurant lookup is taking longer than expected.");
    }, PUBLIC_LOAD_TIMEOUT_MS);

    const unsubscribe = listenPublicRestaurant(slug, (item) => {
      if (!active) return;
      window.clearTimeout(timeoutId);
      setRestaurant(item);
      setLoadingForMs(Math.round(performance.now() - startedAt));
      setError(null);
      setStatus("success");
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [slug, version]);

  return { restaurant, status, error, retry, loadingForMs };
}

export function usePublicMenu(restaurantId?: string) {
  const ownerMenuItems = useAppStore((state) => state.menuItems);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [status, setStatus] = useState<PublicDataStatus>(restaurantId ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [loadingForMs, setLoadingForMs] = useState(0);
  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startedAt = performance.now();
    const loadingTimerId = window.setTimeout(() => {
      if (cancelled) return;
      if (!restaurantId) {
        setItems([]);
        setOffers([]);
        setStatus("idle");
        return;
      }
      setStatus("loading");
      setError(null);
    }, 0);

    if (!restaurantId) {
      return () => {
        cancelled = true;
        window.clearTimeout(loadingTimerId);
      };
    }

    const cacheKey = `${PUBLIC_MENU_CACHE_PREFIX}${restaurantId}`;
    const cachedTimerId = window.setTimeout(() => {
      const cached = readCache<{ items: MenuItem[]; offers: Offer[] }>(cacheKey, { items: [], offers: [] });
      if (!cancelled && (cached.items.length || cached.offers.length)) {
        window.clearTimeout(timeoutId);
        setItems(cached.items);
        setOffers(cached.offers);
        setStatus("success");
      }
      void readIndexedCache<{ items: MenuItem[]; offers: Offer[] }>(cacheKey, { items: [], offers: [] })
        .then((indexed) => {
          if (!cancelled && (indexed.items.length || indexed.offers.length)) {
            window.clearTimeout(timeoutId);
            setItems(indexed.items);
            setOffers(indexed.offers);
            setStatus("success");
          }
        });
    }, 75);
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      window.clearTimeout(loadingTimerId);
      setLoadingForMs(Math.round(performance.now() - startedAt));
      setStatus("error");
      setError("Menu data is taking longer than expected.");
    }, PUBLIC_LOAD_TIMEOUT_MS);

    let menuLoaded = false;
    let offersLoaded = false;
    let latestItems: MenuItem[] = [];
    let latestOffers: Offer[] = [];
    const markLoaded = () => {
      if (!cancelled && menuLoaded && offersLoaded) {
        window.clearTimeout(loadingTimerId);
        window.clearTimeout(cachedTimerId);
        window.clearTimeout(timeoutId);
        writeCache(cacheKey, { items: latestItems, offers: latestOffers });
        setLoadingForMs(Math.round(performance.now() - startedAt));
        setError(null);
        setStatus("success");
      }
    };

    const unsubscribeMenu = listenPublicMenu(
      restaurantId,
      (nextItems) => {
        if (cancelled) return;
        menuLoaded = true;
        latestItems = nextItems;
        setItems(nextItems);
        markLoaded();
      },
    );
    const unsubscribeOffers = listenPublicOffers(
      restaurantId,
      (nextOffers) => {
        if (cancelled) return;
        offersLoaded = true;
        latestOffers = nextOffers;
        setOffers(nextOffers);
        markLoaded();
      },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimerId);
      window.clearTimeout(cachedTimerId);
      window.clearTimeout(timeoutId);
      unsubscribeMenu();
      unsubscribeOffers();
    };
  }, [restaurantId, version]);

  const localOwnerItems = useMemo(
    () => ownerMenuItems.filter((item) => isCustomerVisibleOwnerMenuItem(item, restaurantId)),
    [ownerMenuItems, restaurantId],
  );
  const publicItems = useMemo(() => items.filter((item) => !isLegacySeededPublicMenuItem(item)), [items]);
  const mergedItems = useMemo(() => mergeMenuItems(publicItems, localOwnerItems), [publicItems, localOwnerItems]);
  const effectiveStatus: PublicDataStatus = restaurantId && localOwnerItems.length && (status === "loading" || status === "error")
    ? "success"
    : status;
  const effectiveError = effectiveStatus === "success" ? null : error;

  return { items: mergedItems, offers, status: effectiveStatus, error: effectiveError, retry, loadingForMs };
}

export function usePublicOffers(restaurants?: Restaurant[]) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [status, setStatus] = useState<PublicDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setStatus("error");
      setError("Offers are taking longer than expected.");
    }, PUBLIC_LOAD_TIMEOUT_MS);
    const restaurantMap = new Map((restaurants ?? []).map((restaurant) => [restaurant.slug, restaurant]));
    const restrictToRestaurants = Boolean(restaurants);

    const unsubscribe = listenPublicOffers(undefined, (items) => {
      if (!active) return;
      window.clearTimeout(timeoutId);
      const visibleOffers = sortOffers(items
        .filter(isOfferLive)
        .filter((offer) => {
          if (!restrictToRestaurants) return true;
          return offer.restaurantSlug ? restaurantMap.has(offer.restaurantSlug) : false;
        })
        .map((offer) => {
          const restaurant = offer.restaurantSlug ? restaurantMap.get(offer.restaurantSlug) : undefined;
          return {
            ...offer,
            restaurantName: restaurant?.name,
            restaurantRating: restaurant?.rating,
            restaurantDistanceKm: restaurant?.distanceKm,
          };
        }));
      setOffers(visibleOffers);
      setError(null);
      setStatus("success");
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [restaurants, version]);

  return { offers, status, error, retry };
}

export function usePublicReviews(restaurantId?: string, menuItemId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ averageRating: 0, ratingCount: 0 });
  const [status, setStatus] = useState<PublicDataStatus>(restaurantId ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => {
    setStatus(restaurantId ? "loading" : "idle");
    setError(null);
    setVersion((value) => value + 1);
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      const id = window.setTimeout(() => {
        setReviews([]);
        setSummary({ averageRating: 0, ratingCount: 0 });
        setStatus("idle");
      }, 0);
      return () => window.clearTimeout(id);
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setStatus("error");
      setError("Reviews are taking longer than expected.");
    }, PUBLIC_LOAD_TIMEOUT_MS);

    const unsubscribe = listenPublicReviews(restaurantId, (payload) => {
      if (!active) return;
      window.clearTimeout(timeoutId);
      setReviews(payload.reviews);
      setSummary(payload.summary);
      setError(null);
      setStatus("success");
    }, menuItemId);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [menuItemId, restaurantId, version]);

  return { reviews, summary, status, error, retry };
}

function isOfferLive(offer: Offer) {
  return isOfferActive(offer);
}

function isCustomerVisibleOwnerMenuItem(item: MenuItem, restaurantId?: string) {
  return Boolean(
    restaurantId &&
      item.restaurantSlug === restaurantId &&
      !item.soldOut &&
      isVisibleOnAnyCustomerMenuChannel(item) &&
      item.name?.trim() &&
      item.price > 0,
  );
}

function mergeMenuItems(remoteItems: MenuItem[], localItems: MenuItem[]) {
  const merged = new Map<string, MenuItem>();
  remoteItems.forEach((item) => merged.set(item.id, item));
  localItems.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
}

function isLegacySeededPublicMenuItem(item: MenuItem) {
  return item.restaurantSlug === "cafe-al-arab-thanisandra" && LEGACY_SEEDED_PUBLIC_MENU_IDS.has(item.id);
}

function isVisibleOnAnyCustomerMenuChannel(item: MenuItem) {
  return (["delivery", "parcel", "dine-in"] as const).some((channel) => item.menuVisibility?.[channel] !== false);
}
