"use client";

import { memo } from "react";
import { Minus, Plus } from "lucide-react";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import type { InventoryItem, MenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type PosProduct = {
  id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  isVeg?: boolean;
  isPopular?: boolean;
  soldOut?: boolean;
  stockLabel?: string;
  badge?: string;
  source: "menu" | "product";
  raw: MenuItem | InventoryItem;
};

function ProductCardComponent({
  item,
  quantity,
  onAdd,
  onQuantity,
}: {
  item: PosProduct;
  quantity: number;
  onAdd: () => void;
  onQuantity: (quantity: number) => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[1.75] bg-slate-100">
        <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="260px" className="object-cover" />
        <div className="absolute left-2 top-2 flex gap-1">
          {item.isPopular ? <span className="rounded-md bg-amber-400 px-2 py-1 text-[11px] font-black text-slate-950">Bestseller</span> : null}
          <span className={item.isVeg === false ? "grid size-5 place-items-center rounded-md bg-red-50 text-red-600" : "grid size-5 place-items-center rounded-md bg-emerald-50 text-emerald-600"}>
            <span className="size-2 rounded-full bg-current" />
          </span>
        </div>
      </div>
      <div className="grid gap-2 p-3">
        <div>
          <h3 className="line-clamp-1 text-sm font-black text-slate-950">{item.name}</h3>
          <p className="text-xs font-medium text-slate-500">{item.stockLabel ?? item.category}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-black text-slate-900">{formatCurrency(item.price)}</p>
          {quantity > 0 ? (
            <div className="flex h-9 items-center rounded-lg border border-emerald-200">
              <Button size="icon-sm" variant="ghost" onClick={() => onQuantity(quantity - 1)} aria-label={`Decrease ${item.name}`}>
                <Minus className="size-4" />
              </Button>
              <span className="w-7 text-center text-sm font-black">{quantity}</span>
              <Button size="icon-sm" variant="ghost" onClick={() => onQuantity(quantity + 1)} aria-label={`Increase ${item.name}`} disabled={item.soldOut}>
                <Plus className="size-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={onAdd} disabled={item.soldOut}>
              Add
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardComponent, (prev, next) => (
  prev.item === next.item &&
  prev.quantity === next.quantity
));
