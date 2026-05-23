"use client";

import { MapPin } from "lucide-react";
import type { CommerceLocation } from "@/hooks/use-location-commerce";

export function LocationSuggestionList({
  locations,
  onSelect,
}: {
  locations: CommerceLocation[];
  onSelect: (location: CommerceLocation) => void;
}) {
  if (!locations.length) return null;

  return (
    <div className="grid gap-2" role="listbox" aria-label="Delivery location results">
      {locations.map((item) => (
        <button
          key={`${item.placeId ?? item.address}-${item.source}`}
          type="button"
          role="option"
          aria-selected="false"
          className="grid min-h-14 w-full grid-cols-[auto_1fr] items-start gap-3 rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onSelect(item)}
        >
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate font-black">{item.label}</span>
            <span className="mt-0.5 block line-clamp-2 text-xs font-semibold leading-5 text-muted-foreground">
              {item.address}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
