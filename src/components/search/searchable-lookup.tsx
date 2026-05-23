"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SearchableLookupItem = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  subtitle?: string;
  meta?: string;
};

type SearchableLookupProps = {
  label: string;
  placeholder?: string;
  items: SearchableLookupItem[];
  onSelect: (item: SearchableLookupItem) => void;
  emptyLabel?: string;
  className?: string;
};

export function SearchableLookup({
  label,
  placeholder = "Search by name or phone",
  items,
  onSelect,
  emptyLabel = "No matches",
  className,
}: SearchableLookupProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const seen = new Set<string>();
    return items
      .filter((item) => {
        if (!normalizedQuery) return false;
        const haystack = [item.name, item.phone, item.email, item.subtitle, item.meta]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .filter((item) => {
        const key = item.id || item.phone || item.email || item.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }, [items, normalizedQuery]);

  return (
    <div className={className}>
      <label className="grid gap-1 text-sm font-semibold">
        {label}
        <span className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
        </span>
      </label>
      {normalizedQuery ? (
        <div className="mt-2 overflow-hidden rounded-md border bg-background shadow-sm">
          {filtered.length ? (
            filtered.map((item) => (
              <Button
                key={`${item.id}-${item.phone ?? item.email ?? item.name}`}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start rounded-none px-3 py-2 text-left"
                onClick={() => {
                  onSelect(item);
                  setQuery(item.phone || item.name);
                }}
              >
                <span className="grid gap-0.5">
                  <span className="font-bold">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[item.phone, item.email, item.subtitle, item.meta].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
