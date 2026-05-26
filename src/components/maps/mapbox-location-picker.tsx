"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Map, { Layer, Marker, NavigationControl, Source, type MapMouseEvent, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMapbox } from "@/components/maps/mapbox-provider";
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

type ViewState = {
  latitude: number;
  longitude: number;
  zoom: number;
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

async function mapboxReverseGeocode(input: {
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
  const mapbox = useMapbox();
  const [query, setQuery] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    mapbox.configured ? "" : "Search registered locations. Mapbox token missing for wider map search.",
  );

  function showRegisteredMatches(nextQuery: string) {
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
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mapbox.enabled, mapbox.token]);

  async function search(nextQuery = query) {
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
  }

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

export function DeliveryRadiusMap({
  location,
  onChange,
  height = 360,
  draggable = true,
}: {
  location: MapboxPickedLocation;
  onChange?: (location: MapboxPickedLocation) => void;
  height?: number;
  draggable?: boolean;
}) {
  const mapbox = useMapbox();
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [viewState, setViewState] = useState<ViewState>({
    latitude: location.latitude,
    longitude: location.longitude,
    zoom: mapbox.defaultZoom,
  });
  const circle = useMemo(() => makeRadiusPolygon(location.latitude, location.longitude, location.deliveryRadiusKm), [location.deliveryRadiusKm, location.latitude, location.longitude]);

  async function updateFromPoint(latitude: number, longitude: number) {
    let address = location.address;
    let placeId = location.placeId;
    if (mapbox.token) {
      try {
        const feature = await mapboxReverseGeocode({ latitude, longitude, token: mapbox.token });
        address = feature?.place_name ?? address;
        placeId = feature?.id ?? placeId;
      } catch {
        setMessage("Reverse geocoding failed. Coordinates were still updated.");
      }
    }
    onChange?.({ ...location, latitude, longitude, address, placeId });
    setViewState((current) => ({ ...current, latitude, longitude }));
  }

  if (!mapbox.enabled || !mapbox.token) {
    return (
      <div className="grid place-items-center rounded-lg border bg-muted p-6 text-center" style={{ minHeight: height }}>
        <div>
          <MapPin className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            {mapbox.enabled ? "Mapbox token missing. Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN." : "Maps are disabled in settings."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border bg-muted" style={{ height }}>
      {!loaded ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-background/80 text-sm font-bold">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Initializing Mapbox
        </div>
      ) : null}
      <Map
        mapboxAccessToken={mapbox.token}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        latitude={viewState.latitude}
        longitude={viewState.longitude}
        zoom={viewState.zoom}
        onMove={(event: ViewStateChangeEvent) => setViewState(event.viewState)}
        onLoad={() => setLoaded(true)}
        onClick={(event: MapMouseEvent) => {
          if (!draggable) return;
          void updateFromPoint(Number(event.lngLat.lat.toFixed(6)), Number(event.lngLat.lng.toFixed(6)));
        }}
        reuseMaps
      >
        <NavigationControl position="top-right" />
        <Source id="delivery-radius" type="geojson" data={circle}>
          <Layer
            id="delivery-radius-fill"
            type="fill"
            paint={{ "fill-color": "#006b5f", "fill-opacity": 0.14 }}
          />
          <Layer
            id="delivery-radius-line"
            type="line"
            paint={{ "line-color": "#006b5f", "line-width": 2 }}
          />
        </Source>
        <Marker
          latitude={location.latitude}
          longitude={location.longitude}
          draggable={draggable}
          onDragEnd={(event) => {
            void updateFromPoint(Number(event.lngLat.lat.toFixed(6)), Number(event.lngLat.lng.toFixed(6)));
          }}
          anchor="bottom"
        >
          <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <MapPin className="size-5" />
          </span>
        </Marker>
      </Map>
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
        <Badge variant="success">{location.deliveryRadiusKm} km delivery radius</Badge>
        {message ? <Badge variant="warning">{message}</Badge> : null}
      </div>
    </div>
  );
}

export function MapLocationPicker({
  value,
  onChange,
}: {
  value: MapboxPickedLocation;
  onChange: (location: MapboxPickedLocation) => void;
}) {
  return (
    <div className="grid gap-4">
      <AddressAutocomplete value={value.address} proximity={value} onSelect={(location) => onChange({ ...value, ...location })} />
      <DeliveryRadiusMap location={value} onChange={onChange} />
      <div className="grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-bold text-muted-foreground md:col-span-2">
          Formatted address
          <Input value={value.address} onChange={(event) => onChange({ ...value, address: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm font-bold text-muted-foreground">
          Latitude
          <Input type="number" value={value.latitude} onChange={(event) => onChange({ ...value, latitude: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm font-bold text-muted-foreground">
          Longitude
          <Input type="number" value={value.longitude} onChange={(event) => onChange({ ...value, longitude: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm font-bold text-muted-foreground md:col-span-4">
          Delivery radius: {value.deliveryRadiusKm} km
          <input type="range" min={1} max={30} value={value.deliveryRadiusKm} onChange={(event) => onChange({ ...value, deliveryRadiusKm: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm font-bold text-muted-foreground md:col-span-4">
          Place ID
          <Input value={value.placeId ?? ""} onChange={(event) => onChange({ ...value, placeId: event.target.value || undefined })} />
        </label>
      </div>
    </div>
  );
}

export function BranchLocationMap({
  branchName,
  location,
}: {
  branchName: string;
  location: MapboxPickedLocation;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-black">{branchName}</p>
          <p className="text-sm text-muted-foreground">{location.address}</p>
        </div>
        <Badge variant="muted">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Badge>
      </div>
      <DeliveryRadiusMap location={location} height={280} draggable={false} />
    </div>
  );
}

export const MapboxLocationPicker = MapLocationPicker;

function makeRadiusPolygon(latitude: number, longitude: number, radiusKm: number) {
  const points: number[][] = [];
  const earthRadiusKm = 6371;
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  const angularDistance = radiusKm / earthRadiusKm;

  for (let bearing = 0; bearing <= 360; bearing += 8) {
    const brng = (bearing * Math.PI) / 180;
    const pointLat = Math.asin(Math.sin(lat) * Math.cos(angularDistance) + Math.cos(lat) * Math.sin(angularDistance) * Math.cos(brng));
    const pointLon = lon + Math.atan2(Math.sin(brng) * Math.sin(angularDistance) * Math.cos(lat), Math.cos(angularDistance) - Math.sin(lat) * Math.sin(pointLat));
    points.push([(pointLon * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [points],
    },
  };
}
