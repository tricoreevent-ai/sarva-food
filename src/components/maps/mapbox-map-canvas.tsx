"use client";

import { Loader2, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Map, { Layer, Marker, NavigationControl, Source, type MapMouseEvent, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import { Badge } from "@/components/ui/badge";
import { mapboxReverseGeocode, type MapboxPickedLocation } from "@/components/maps/address-autocomplete";
import { useMapbox } from "@/components/maps/mapbox-provider";

type ViewState = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export function DeliveryRadiusMapCanvas({
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

  useEffect(() => {
    ensureMapboxStylesheet();
  }, []);

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

function ensureMapboxStylesheet() {
  const id = "sarva-mapbox-gl-css";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "https://api.mapbox.com/mapbox-gl-js/v3.23.1/mapbox-gl.css";
  document.head.appendChild(link);
}

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
