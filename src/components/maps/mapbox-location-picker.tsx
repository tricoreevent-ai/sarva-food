"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete, type MapboxPickedLocation } from "@/components/maps/address-autocomplete";
import { MapboxProvider } from "@/components/maps/mapbox-provider";

export type { MapboxPickedLocation } from "@/components/maps/address-autocomplete";

const LazyDeliveryRadiusMap = dynamic(
  () => import("@/components/maps/mapbox-map-canvas").then((module) => module.DeliveryRadiusMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[280px] place-items-center rounded-lg border bg-muted text-sm font-bold">
        <Loader2 className="mr-2 inline size-4 animate-spin" />
        Initializing Mapbox
      </div>
    ),
  },
);

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
  return (
    <MapboxProvider>
      <LazyDeliveryRadiusMap location={location} onChange={onChange} height={height} draggable={draggable} />
    </MapboxProvider>
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
    <MapboxProvider>
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
    </MapboxProvider>
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
