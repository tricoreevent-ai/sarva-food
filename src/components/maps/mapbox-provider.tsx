"use client";

import { createContext, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "sarva-mapbox-runtime-settings";

export type MapboxRuntimeSettings = {
  enabled: boolean;
  token: string;
  defaultZoom: number;
  defaultCountry: string;
  defaultDeliveryRadiusKm: number;
};

type MapboxContextValue = MapboxRuntimeSettings & {
  configured: boolean;
  setRuntimeSettings: (settings: Partial<MapboxRuntimeSettings>) => void;
};

function readRuntimeSettings(): Partial<MapboxRuntimeSettings> {
  if (typeof window === "undefined") return {};
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as Partial<MapboxRuntimeSettings>) : {};
  } catch {
    return {};
  }
}

const MapboxContext = createContext<MapboxContextValue>({
  enabled: true,
  token: "",
  defaultZoom: 14,
  defaultCountry: "in",
  defaultDeliveryRadiusKm: 7,
  configured: false,
  setRuntimeSettings: () => undefined,
});

export function MapboxProvider({ children }: { children: React.ReactNode }) {
  const envToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.replace(/\s+/g, "") ?? "";
  const [settings, setSettings] = useState<Partial<MapboxRuntimeSettings>>(() => readRuntimeSettings());
  const value = useMemo<MapboxContextValue>(() => {
    const token = (settings.token || envToken).replace(/\s+/g, "");
    return {
      enabled: settings.enabled ?? true,
      token,
      defaultZoom: settings.defaultZoom ?? 14,
      defaultCountry: settings.defaultCountry ?? "in",
      defaultDeliveryRadiusKm: settings.defaultDeliveryRadiusKm ?? 7,
      configured: Boolean(token),
      setRuntimeSettings: (next) => {
        setSettings((current) => {
          const merged = { ...current, ...next };
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      },
    };
  }, [envToken, settings]);

  return <MapboxContext.Provider value={value}>{children}</MapboxContext.Provider>;
}

export function useMapbox() {
  return useContext(MapboxContext);
}
