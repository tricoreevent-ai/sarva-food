"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultDeliveryLocation,
  matchRegisteredDeliveryLocations,
  registeredDeliveryLocations,
} from "@/lib/locations/registered-locations";
import type { Restaurant } from "@/lib/types";

export type CommerceLocation = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  source: "gps" | "manual" | "recent" | "fallback";
};

type MapboxFeature = {
  id: string;
  place_name: string;
  text?: string;
  center?: [number, number];
};

const STORAGE_KEY = "sarva-commerce-location";
const RECENTS_KEY = "sarva-commerce-recent-locations";
const SUGGESTIONS_KEY = "sarva-commerce-location-suggestions";
const GPS_PROMPTED_KEY = "sarva-commerce-gps-prompted-session:v2";
const GPS_PERMISSION_KEY = "sarva-commerce-gps-permission:v1";

export const defaultLocation: CommerceLocation = defaultDeliveryLocation;
const placeSuggestions: CommerceLocation[] = registeredDeliveryLocations;

function normalizeKey(location: Pick<CommerceLocation, "address" | "placeId">) {
  return (location.placeId || location.address).trim().toLowerCase();
}

function uniqueLocations(locations: CommerceLocation[]) {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = normalizeKey(location);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function localLocationMatches(query: string, locations: CommerceLocation[]) {
  return matchRegisteredDeliveryLocations(query, locations);
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persistLocation(location: CommerceLocation) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    if (location.source === "fallback") return;
    const recents = readJson<CommerceLocation[]>(RECENTS_KEY, []);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(uniqueLocations([location, ...recents]).slice(0, 5)));
  } catch {
    // Private browsing and strict storage settings can reject persistence.
  }
}

function persistSuggestions(locations: CommerceLocation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(uniqueLocations(locations).slice(0, 8)));
  } catch {
    // Location suggestions are a convenience cache only.
  }
}

export function distanceKm(
  a: Pick<CommerceLocation, "latitude" | "longitude">,
  b: { latitude?: number; longitude?: number },
) {
  if (typeof b.latitude !== "number" || typeof b.longitude !== "number") return 99;
  const radius = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

export function getLocationRestaurants(restaurants: Restaurant[], location: CommerceLocation) {
  return restaurants
    .filter((restaurant) => restaurant.approved !== false)
    .map((restaurant) => {
      const distance = distanceKm(location, restaurant);
      const etaMinutes = estimateDeliveryMinutes(distance, restaurant.deliveryTime);
      const deliveryEligible = distance <= (restaurant.deliveryRadiusKm ?? 12);
      return {
        ...restaurant,
        distanceKm: distance,
        etaMinutes,
        deliveryEligible,
        deliveryTime: restaurant.deliveryTime || `${etaMinutes}-${etaMinutes + 8} min`,
      };
    })
    .sort((a, b) =>
      Number(a.deliveryEligible === false) - Number(b.deliveryEligible === false) ||
      a.distanceKm - b.distanceKm ||
      b.rating - a.rating,
    );
}

export function getDeliveryRestaurants(restaurants: Restaurant[], location: CommerceLocation) {
  return getLocationRestaurants(restaurants, location).filter((restaurant) => restaurant.deliveryEligible);
}

export function useLocationCommerce(restaurants: Restaurant[]) {
  const [hydrated, setHydrated] = useState(false);
  const [location, setLocationState] = useState<CommerceLocation>(defaultLocation);
  const [recentLocations, setRecentLocations] = useState<CommerceLocation[]>([]);
  const [suggestions, setSuggestions] = useState<CommerceLocation[]>([defaultLocation]);
  const [status, setStatus] = useState("Choose delivery location");
  const [detecting, setDetecting] = useState(false);
  const [permission, setPermission] = useState<PermissionState | "unsupported">("unsupported");
  const [promptedForGps, setPromptedForGps] = useState(false);
  const searchSequence = useRef(0);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.replace(/\s+/g, "");

  useEffect(() => {
    const id = window.setTimeout(() => {
      const storedLocation = normalizeStoredLocation(readJson(STORAGE_KEY, defaultLocation));
      const storedRecents = readJson<CommerceLocation[]>(RECENTS_KEY, []);
      const storedSuggestions = readJson<CommerceLocation[]>(SUGGESTIONS_KEY, []);
      setLocationState(storedLocation);
      setRecentLocations(storedRecents);
      setSuggestions(uniqueLocations([...storedSuggestions, ...storedRecents, ...placeSuggestions]));
      setPromptedForGps(window.sessionStorage.getItem(GPS_PROMPTED_KEY) === "true");
      const storedPermission = window.localStorage.getItem(GPS_PERMISSION_KEY);
      if (storedPermission === "granted" || storedPermission === "denied" || storedPermission === "prompt") {
        setPermission(storedPermission);
      }
      setStatus(storedLocation.source === "fallback" ? "Choose delivery location" : `Delivering to ${storedLocation.label}`);
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  const selectLocation = useCallback((next: CommerceLocation) => {
    setLocationState(next);
    persistLocation(next);
    setRecentLocations(readJson(RECENTS_KEY, []));
    setStatus(`Delivering to ${next.label}`);
  }, []);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    if (!mapboxToken) {
      selectLocation({
        label: "Current location",
        address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        latitude,
        longitude,
        source: "gps",
      });
      return;
    }

    try {
      const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`);
      url.searchParams.set("access_token", mapboxToken);
      url.searchParams.set("limit", "1");
      const response = await fetch(url.toString());
      const payload = (await response.json()) as { features?: MapboxFeature[] };
      const feature = payload.features?.[0];
      selectLocation({
        label: feature?.text ?? "Current location",
        address: feature?.place_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        latitude,
        longitude,
        placeId: feature?.id,
        source: "gps",
      });
    } catch {
      setStatus("GPS found, but reverse geocoding failed. Using coordinates.");
      selectLocation({ label: "Current location", address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, latitude, longitude, source: "gps" });
    }
  }, [mapboxToken, selectLocation]);

  const requestCurrentPosition = useCallback((reason: "initial" | "refresh") => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      selectLocation(defaultLocation);
      setStatus("GPS is not available. Using Bengaluru fallback.");
      return;
    }
    if (reason === "initial") {
      try {
        window.sessionStorage.setItem(GPS_PROMPTED_KEY, "true");
      } catch {
        // The in-memory prompted flag still prevents repeat prompts this session.
      }
      setPromptedForGps(true);
    }
    setDetecting(true);
    setStatus("Requesting location permission...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermission("granted");
        try {
          window.localStorage.setItem(GPS_PERMISSION_KEY, "granted");
        } catch {
          // Permission state is still held in React state for this session.
        }
        void reverseGeocode(position.coords.latitude, position.coords.longitude).finally(() => setDetecting(false));
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        const timedOut = error.code === error.TIMEOUT;
        if (denied) {
          setPermission("denied");
          try {
            window.localStorage.setItem(GPS_PERMISSION_KEY, "denied");
          } catch {
            // Permission state is still held in React state for this session.
          }
        }
        selectLocation(defaultLocation);
        setStatus(
          denied
            ? "Location permission denied. Choose a delivery area."
            : timedOut
              ? "Location timed out. Using Bengaluru fallback."
              : "Location unavailable. Using Bengaluru fallback.",
        );
        setDetecting(false);
      },
      { enableHighAccuracy: reason === "refresh", maximumAge: 300000, timeout: reason === "initial" ? 4500 : 6000 },
    );
  }, [reverseGeocode, selectLocation]);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const id = window.setTimeout(() => {
        setPermission("unsupported");
        setStatus("GPS is not available. Choose a delivery area.");
      }, 0);
      return () => window.clearTimeout(id);
    }

    if (!("permissions" in navigator)) {
      if (!promptedForGps) {
        const id = window.setTimeout(() => requestCurrentPosition("initial"), 1800);
        return () => window.clearTimeout(id);
      }
      return;
    }

    let active = true;
    void navigator.permissions.query({ name: "geolocation" })
      .then((result) => {
        if (!active) return;
        setPermission(result.state);
        try {
          window.localStorage.setItem(GPS_PERMISSION_KEY, result.state);
        } catch {
          // Permission state is still held in React state for this session.
        }
        result.onchange = () => {
          if (!active) return;
          setPermission(result.state);
          try {
            window.localStorage.setItem(GPS_PERMISSION_KEY, result.state);
          } catch {
            // Permission state is still held in React state for this session.
          }
        };
        if (result.state === "granted") {
          window.setTimeout(() => {
            if (!active) return;
            navigator.geolocation.getCurrentPosition(
              (position) => {
                if (active) void reverseGeocode(position.coords.latitude, position.coords.longitude);
              },
              () => {
                if (active) setStatus("Location unavailable. Choose a delivery area.");
              },
              { enableHighAccuracy: false, maximumAge: 600000, timeout: 5000 },
            );
          }, 500);
          return;
        }
        if (result.state === "prompt" && !promptedForGps) {
          window.setTimeout(() => {
            if (active) requestCurrentPosition("initial");
          }, 1800);
          return;
        }
        if (result.state === "denied") {
          setStatus("Location permission denied. Choose a delivery area.");
        }
      })
      .catch(() => {
        if (!active) return;
        setPermission("unsupported");
        if (!promptedForGps) {
          window.setTimeout(() => {
            if (active) requestCurrentPosition("initial");
          }, 1800);
        }
      });

    return () => {
      active = false;
    };
  }, [hydrated, promptedForGps, requestCurrentPosition, reverseGeocode]);

  const detectLocation = useCallback(() => {
    requestCurrentPosition("refresh");
  }, [requestCurrentPosition]);

  const searchPlaces = useCallback(async (query: string) => {
    const sequence = searchSequence.current + 1;
    searchSequence.current = sequence;
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      setSuggestions(uniqueLocations([...recentLocations, ...readJson<CommerceLocation[]>(SUGGESTIONS_KEY, []), defaultLocation]));
      return;
    }

    const cached = uniqueLocations([...recentLocations, ...readJson<CommerceLocation[]>(SUGGESTIONS_KEY, []), ...placeSuggestions]);
    const localMatches = localLocationMatches(query, cached);
    if (localMatches.length) {
      setSuggestions(localMatches);
      setStatus("Select a matching registered or recent location.");
    } else {
      setSuggestions([]);
      setStatus(mapboxToken ? "Searching map results..." : "No matching registered location found.");
    }

    if (mapboxToken) {
      try {
        const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
        url.searchParams.set("access_token", mapboxToken);
        url.searchParams.set("autocomplete", "true");
        url.searchParams.set("country", "in");
        url.searchParams.set("limit", "5");
        url.searchParams.set("proximity", `${location.longitude},${location.latitude}`);
        const response = await fetch(url.toString());
        const payload = (await response.json()) as { features?: MapboxFeature[] };
        const mapped = (payload.features ?? []).map((feature) => ({
          label: feature.text ?? feature.place_name,
          address: feature.place_name,
          latitude: feature.center?.[1] ?? defaultLocation.latitude,
          longitude: feature.center?.[0] ?? defaultLocation.longitude,
          placeId: feature.id,
          source: "manual" as const,
        }));
        const nextSuggestions = uniqueLocations([...localMatches, ...mapped]);
        if (searchSequence.current !== sequence) return;
        if (nextSuggestions.length) {
          persistSuggestions(nextSuggestions);
          setSuggestions(nextSuggestions);
          setStatus("Select a matching delivery location.");
          return;
        }
      } catch {
        setStatus("Map search failed. Showing registered and recent locations.");
      }
    }

    if (searchSequence.current !== sequence) return;
    setSuggestions(localMatches);
    setStatus(
      localMatches.length
        ? "Select a matching registered or recent location."
        : mapboxToken
          ? "No matching registered location found."
          : "Mapbox token missing. Showing registered locations only.",
    );
  }, [location.latitude, location.longitude, mapboxToken, recentLocations]);

  const locationRestaurants = useMemo(() => getLocationRestaurants(restaurants, location), [location, restaurants]);
  const nearbyRestaurants = useMemo(
    () => locationRestaurants.filter((restaurant) => restaurant.deliveryEligible),
    [locationRestaurants],
  );
  const unavailableRestaurants = useMemo(
    () => locationRestaurants.filter((restaurant) => !restaurant.deliveryEligible),
    [locationRestaurants],
  );

  return {
    location,
    locationRestaurants,
    nearbyRestaurants,
    unavailableRestaurants,
    suggestions,
    recentLocations,
    status,
    detecting,
    hydrated,
    permission,
    promptedForGps,
    detectLocation,
    searchPlaces,
    selectLocation,
  };
}

function normalizeStoredLocation(location: CommerceLocation): CommerceLocation {
  if (location.placeId === "fallback-indiranagar" || location.address === "Indiranagar, Bengaluru, Karnataka") {
    return defaultLocation;
  }
  return location;
}

function estimateDeliveryMinutes(distance: number, existing?: string) {
  const existingMinutes = Number.parseInt(existing ?? "", 10);
  if (Number.isFinite(existingMinutes) && existingMinutes > 0) return existingMinutes;
  if (!Number.isFinite(distance) || distance >= 99) return 35;
  return Math.max(18, Math.min(55, Math.round(16 + distance * 4)));
}
