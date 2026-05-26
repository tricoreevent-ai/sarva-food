"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
};

export function CreatableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  allowCreateOptions = false,
  className,
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  allowCreateOptions?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedSelected = useMemo(() => new Set(value.map(normalize)), [value]);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);
    return options
      .filter((option) => !normalizedSelected.has(normalize(option.value)))
      .filter((option) => !normalizedQuery || normalize(option.label).includes(normalizedQuery))
      .slice(0, 12);
  }, [normalizedSelected, options, query]);
  const canCreate = allowCreateOptions && query.trim().length > 0 &&
    !options.some((option) => normalize(option.label) === normalize(query) || normalize(option.value) === normalize(query)) &&
    !normalizedSelected.has(normalize(query));

  function addOption(nextValue: string) {
    const cleaned = nextValue.trim();
    if (!cleaned || normalizedSelected.has(normalize(cleaned))) return;
    onChange([...value, cleaned]);
    setQuery("");
    setOpen(false);
  }

  function removeOption(nextValue: string) {
    onChange(value.filter((item) => normalize(item) !== normalize(nextValue)));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const first = filteredOptions[0];
      if (first) addOption(first.value);
      else if (canCreate) addOption(query);
    }
    if (event.key === "Backspace" && !query && value.length) {
      removeOption(value[value.length - 1] ?? "");
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-input bg-card px-2 py-2 text-sm text-foreground ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onClick={() => setOpen(true)}
      >
        {value.map((item) => (
          <span key={item} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
            <span className="truncate">{item}</span>
            <button type="button" className="rounded-full p-0.5 hover:bg-background/60" onClick={(event) => { event.stopPropagation(); removeOption(item); }} aria-label={`Remove ${item}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          className="min-w-40 flex-1 border-0 bg-transparent px-1 py-1 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          onKeyDown={handleKeyDown}
          placeholder={value.length ? "" : placeholder}
        />
      </div>
      {open && (filteredOptions.length || canCreate) ? (
        <div className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addOption(option.value)}
            >
              <span>{option.label}</span>
              <Check className="size-4 text-muted-foreground" />
            </button>
          ))}
          {canCreate ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-primary hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addOption(query)}
            >
              <Plus className="size-4" />
              Create &quot;{query.trim()}&quot;
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
