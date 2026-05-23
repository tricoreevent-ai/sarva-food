"use client";

import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

export type PosCategory = { id: string; name: string; count: number };

export function CategoryList({
  categories,
  active,
  onSelect,
}: {
  categories: PosCategory[];
  active: string;
  onSelect: (name: string) => void;
}) {
  return (
    <aside className="customer-scroll flex gap-2 overflow-x-auto border-b border-slate-100 p-3 lg:block lg:w-52 lg:shrink-0 lg:space-y-1 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={cn("flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold", !active && "bg-emerald-50 text-emerald-700")}
      >
        <ShoppingCart className="size-4" />
        All Items
        <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-500">{categories.reduce((sum, item) => sum + item.count, 0)}</span>
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.name)}
          className={cn("flex h-10 w-full shrink-0 items-center justify-between gap-2 rounded-xl px-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50", active === category.name && "bg-emerald-50 text-emerald-700")}
        >
          <span className="truncate">{category.name}</span>
          <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-500">{category.count}</span>
        </button>
      ))}
    </aside>
  );
}
