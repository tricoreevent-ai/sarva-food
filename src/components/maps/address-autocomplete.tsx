"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapboxProvider, useMapbox } from "@/components/maps/mapbox-provider";
import {
  matchRegisteredDeliveryLocations,
  normalizeLocationSearch,
  registeredDeliveryLocations,
} from "@/lib/locations/registered-locations";

export type MapboxPickedLocation = {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  deliveryRadiusKm: number;
};

export type MapboxFeature = {
  id: string;
  place_name: string;
  text?: string;
  center?: [number, number];
};

function featureKey(feature: MapboxFeature, index: number) {
  return `${feature.id || feature.place_name}-${index}`;
}

function uniqueFeatures(features: MapboxFeature[]) {
  const seen = new Set<string>();
  return features.filter((feature) => {
    const key = normalizeLocationSearch(feature.id || feature.place_name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function registeredLocationFeatures(query: string): MapboxFeature[] {
  return matchRegisteredDeliveryLocations(query, registeredDeliveryLocations).map((location) => ({
    id: location.placeId,
    place_name: location.address,
    text: location.label,
    center: [location.longitude, location.latitude],
  }));
}

async function mapboxSearch(input: {
  query: string;
  token: string;
  country: string;
  proximity?: { latitude: number; longitude: number };
}) {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input.query)}.json`);
  url.searchParams.set("access_token", input.token);
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("country", input.country);
  url.searchParams.set("limit", "6");
  if (input.proximity) {
    url.searchParams.set("proximity", `${input.proximity.longitude},${input.proximity.latitude}`);
  }
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Mapbox autocomplete failed.");
  const payload = (await response.json()) as { features?: MapboxFeature[] };
  return uniqueFeatures(payload.features ?? []);
}

export async function mapboxReverseGeocode(input: {
  latitude: number;
  longitude: number;
  token: string;
}) {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${input.longitude},${input.latitude}.json`);
  url.searchParams.set("access_token", input.token);
  url.searchParams.set("limit", "1");
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Mapbox reverse geocoding failed.");
  const payload = (await response.json()) as { features?: MapboxFeature[] };
  return payload.features?.[0] ?? null;
}

export function AddressAutocomplete({
  value,
  onSelect,
  placeholder = "Search address",
  proximity,
}: {
  value?: string;
  onSelect: (location: MapboxPickedLocation) => void;
  placeholder?: string;
  proximity?: { latitude: number; longitude: number };
}) {
  return (
    <MapboxProvider>
      <AddressAutocompleteInner value={value} onSelect={onSelect} placeholder={placeholder} proximity={proximity} />
    </MapboxProvider>
  );
}

function AddressAutocompleteInner({
  value,
  onSelect,
  placeholder = "Search address",
  proximity,
}: {
  value?: string;
  onSelect: (location: MapboxPickedLocation) => void;
  placeholder?: string;
  proximity?: { latitude: number; longitude: number };
}) {
  const mapbox = useMapbox();
  const [query, setQuery] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    mapbox.configured ? "" : "Search registered locations. Mapbox token missing for wider map search.",
  );

  const showRegisteredMatches = useCallback((nextQuery: string) => {
    if (nextQuery.trim().length < 3) {
      setSuggestions([]);
      setMessage("");
      return [];
    }

    const matches = registeredLocationFeatures(nextQuery);
    setSuggestions(matches);
    if (matches.length) {
      setMessage("Select a matching registered address.");
    } else {
      setMessage(mapbox.enabled && mapbox.token ? "Press Search for map results." : "No registered address matches found.");
    }
    return matches;
  }, [mapbox.enabled, mapbox.token]);

  const search = useCallback(async (nextQuery = query) => {
    if (nextQuery.trim().length < 3) {
      setSuggestions([]);
      setMessage("Enter at least 3 characters.");
      return;
    }
    const localMatches = showRegisteredMatches(nextQuery);
    if (!mapbox.enabled) {
      setMessage(localMatches.length ? "Select a matching registered address." : "Maps are disabled in settings.");
      return;
    }
    if (!mapbox.token) {
      setMessage(
        localMatches.length
          ? "Select a matching registered address."
          : "Mapbox token missing. No registered address matches found.",
      );
      return;
    }
    setLoading(true);
    try {
      const features = await mapboxSearch({ query: nextQuery, token: mapbox.token, country: mapbox.defaultCountry, proximity });
      const merged = uniqueFeatures([...localMatches, ...features]);
      setSuggestions(merged);
      setMessage(merged.length ? "Select a matching address." : "No address matches found.");
    } catch {
      setSuggestions(localMatches);
      setMessage(localMatches.length ? "Map search failed. Showing registered addresses." : "Address search failed.");
    } finally {
      setLoading(false);
    }
  }, [mapbox.defaultCountry, mapbox.enabled, mapbox.token, proximity, query, showRegisteredMatches]);

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(value ?? ""), 0);
    return () => window.clearTimeout(id);
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 3) {
      const id = window.setTimeout(() => {
        setSuggestions([]);
        setMessage("");
      }, 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      void search(query);
    }, 350);
    return () => window.clearTimeout(id);
  }, [query, search]);

  function selectFeature(feature: MapboxFeature) {
    const [longitude, latitude] = feature.center ?? [proximity?.longitude ?? 77.6412, proximity?.latitude ?? 12.9719];
    setQuery(feature.place_name);
    setSuggestions([]);
    onSelect({
      address: feature.place_name,
      latitude,
      longitude,
      placeId: feature.id,
      deliveryRadiusKm: mapbox.defaultDeliveryRadiusKm,
    });
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              showRegisteredMatches(nextQuery);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search(query);
              }
            }}
            placeholder={placeholder}
          />
        </label>
        <Button type="button" onClick={() => void search()} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
          Search
        </Button>
      </div>
      {message ? <p className="text-xs font-semibold text-muted-foreground">{message}</p> : null}
      {suggestions.length ? (
        <div className="grid gap-2" role="listbox" aria-label="Address search results">
          {suggestions.map((feature, index) => (
            <button
              key={featureKey(feature, index)}
              type="button"
              role="option"
              aria-selected="false"
              className="rounded-md border border-border bg-card p-3 text-left text-sm font-semibold text-foreground hover:border-primary hover:bg-muted"
              onClick={() => selectFeature(feature)}
            >
              <span className="block font-black">{feature.text ?? feature.place_name}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{feature.place_name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
