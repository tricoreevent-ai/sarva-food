"use client";

import { DatabaseZap, Save } from "lucide-react";
import { useState } from "react";
import { MapboxLocationPicker, type MapboxPickedLocation } from "@/components/maps/mapbox-location-picker";
import { useMapbox } from "@/components/maps/mapbox-provider";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { safeSaveRestaurantSettings } from "@/services/restaurant-ops-service";
import { initializeFirestoreBaseline } from "@/services/firestore-init-service";
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from "@/lib/tenant";
import type { RestaurantSettingsDoc } from "@/types/firebase";

export default function AdminMapConfigurationPage() {
  const [location, setLocation] = useState<MapboxPickedLocation>({
    address: "12 100 Feet Road, Indiranagar, Bengaluru",
    latitude: 12.9719,
    longitude: 77.6412,
    deliveryRadiusKm: 7,
  });
  const mapbox = useMapbox();
  const [enabled, setEnabled] = useState(mapbox.enabled);
  const [tokenAlias, setTokenAlias] = useState(mapbox.token);
  const [defaultZoom, setDefaultZoom] = useState(String(mapbox.defaultZoom));
  const [defaultCountry, setDefaultCountry] = useState(mapbox.defaultCountry);
  const [defaultRadius, setDefaultRadius] = useState(String(mapbox.defaultDeliveryRadiusKm));
  const [status, setStatus] = useState("Ready");

  async function save() {
    const now = new Date();
    const settings: RestaurantSettingsDoc = {
      id: `settings-${DEFAULT_TENANT_ID}-map`,
      tenantId: DEFAULT_TENANT_ID,
      restaurantId: DEFAULT_TENANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      mapboxToken: tokenAlias,
      mapDefaults: {
        latitude: location.latitude,
        longitude: location.longitude,
        zoom: Number(defaultZoom) || 14,
        country: defaultCountry,
      },
      geocoding: {
        autocomplete: true,
        reverseGeocoding: true,
        proximityBias: true,
      },
      deliveryRadiusKm: Number(defaultRadius) || location.deliveryRadiusKm,
      createdAt: now,
      updatedAt: now,
    };
    mapbox.setRuntimeSettings({
      enabled,
      token: tokenAlias,
      defaultZoom: Number(defaultZoom) || 14,
      defaultCountry,
      defaultDeliveryRadiusKm: Number(defaultRadius) || location.deliveryRadiusKm,
    });
    await safeSaveRestaurantSettings(settings);
    setStatus("Map configuration saved");
  }

  async function seedFirestore() {
    setStatus("Initializing Firestore baseline...");
    const result = await initializeFirestoreBaseline();
    setStatus(result.message);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Map configuration"
        description="Mapbox autocomplete, reverse geocoding, default map center, and delivery radius settings."
        action={<Badge variant={mapbox.configured ? "success" : "warning"}>{mapbox.configured ? "Token configured" : "Token missing"}</Badge>}
      />
      <Card>
        <CardContent className="space-y-5 p-5">
          <label className="grid gap-2 text-sm font-bold">
            Mapbox public token
            <Input value={tokenAlias} onChange={(event) => setTokenAlias(event.target.value)} placeholder="Use NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in production" />
          </label>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-bold">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              Maps enabled
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Default zoom
              <Input type="number" min={4} max={20} value={defaultZoom} onChange={(event) => setDefaultZoom(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Default country
              <Input value={defaultCountry} onChange={(event) => setDefaultCountry(event.target.value.toLowerCase())} />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Default radius km
              <Input type="number" min={1} max={30} value={defaultRadius} onChange={(event) => setDefaultRadius(event.target.value)} />
            </label>
          </div>
          <MapboxLocationPicker value={location} onChange={setLocation} />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void save()}>
              <Save className="size-4" />
              Save map settings
            </Button>
            <Button variant="outline" onClick={() => void seedFirestore()}>
              <DatabaseZap className="size-4" />
              Initialize Firestore
            </Button>
            <Badge variant="muted">{status}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
