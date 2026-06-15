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
import type { AppCategory, AppCuisine, MenuItem, Offer, Restaurant, Review } from "@/lib/types";
import { isOfferActive, sortOffers } from "@/lib/offer-engine";

const PUBLIC_LOAD_TIMEOUT_MS = 8000;
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
const LEGACY_SEEDED_PUBLIC_OFFER_CODES = new Set(["ARABIC20", "INSTA20"]);

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
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setLoadingForMs(Math.round(performance.now() - startedAt));
    }, PUBLIC_LOAD_TIMEOUT_MS);

    const unsubscribe = listenPublicRestaurants(
      (items) => {
        if (!active) return;
        window.clearTimeout(timeoutId);
        setRestaurants(items);
        setLoadingForMs(Math.round(performance.now() - startedAt));
        setError(null);
        setStatus("success");
      },
      {
        preloadPrimaryMenu,
        onError: () => {
          if (!active) return;
          window.clearTimeout(timeoutId);
          setLoadingForMs(Math.round(performance.now() - startedAt));
          setError("No restaurants are available for this location.");
          setStatus("error");
        },
      },
    );

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
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
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setStatus("error");
      setError("Cuisine types are taking longer than expected.");
    }, PUBLIC_LOAD_TIMEOUT_MS);

    const unsubscribe = listenPublicCuisines((items) => {
      if (!active) return;
      window.clearTimeout(timeoutId);
      setCuisines(items);
      setError(null);
      setStatus("success");
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
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
        window.clearTimeout(timeoutId);
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
        latestItems = filterPublicMenuItems(nextItems);
        setItems(latestItems);
        markLoaded();
      },
    );
    const unsubscribeOffers = listenPublicOffers(
      restaurantId,
      (nextOffers) => {
        if (cancelled) return;
        offersLoaded = true;
        latestOffers = filterPublicOffers(nextOffers);
        setOffers(latestOffers);
        markLoaded();
      },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimerId);
      window.clearTimeout(timeoutId);
      unsubscribeMenu();
      unsubscribeOffers();
    };
  }, [restaurantId, version]);

  const publicItems = useMemo(() => filterPublicMenuItems(items), [items]);
  return { items: publicItems, offers, status, error, retry, loadingForMs };
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
  return isOfferActive(offer) && !LEGACY_SEEDED_PUBLIC_OFFER_CODES.has(offer.code.toUpperCase());
}

function filterPublicMenuItems(items: MenuItem[]) {
  return items.filter((item) => !isLegacySeededPublicMenuItem(item));
}

function filterPublicOffers(offers: Offer[]) {
  return offers.filter(isOfferLive);
}

function isLegacySeededPublicMenuItem(item: MenuItem) {
  return item.restaurantSlug === "cafe-al-arab-thanisandra" && LEGACY_SEEDED_PUBLIC_MENU_IDS.has(item.id);
}
