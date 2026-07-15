"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Minus, Plus, Timer } from "lucide-react";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import type { MenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function FoodItemCard({ item }: { item: MenuItem }) {
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const quantity =
    useCartStore((state) => state.items.find((line) => line.id === item.id)?.quantity) ?? 0;

  return (
    <motion.article
      layout
      whileTap={{ scale: 0.985 }}
      className="mobile-premium-card flex h-full flex-col overflow-hidden rounded-xl bg-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} cloudinaryPreset="productGrid" sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw" className="object-cover" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <Badge variant={item.isVeg ? "success" : "warning"}>{item.isVeg ? "Veg" : "Non-veg"}</Badge>
          {item.isPopular ? <Badge className="bg-secondary text-secondary-foreground">Popular</Badge> : null}
          {item.soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-3">
        <Link href={`/restaurant/${item.restaurantSlug}/item/${item.id}`} className="block">
          <h3 className="line-clamp-2 text-sm font-black leading-tight md:text-base">{item.name}</h3>
          <div className="mt-1 min-h-4 text-[0.7rem] font-bold text-muted-foreground">
            {item.prepTime ? (
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3" aria-hidden="true" />
                {item.prepTime}
              </span>
            ) : null}
          </div>
          <p className="mt-1 hidden line-clamp-2 text-xs leading-5 text-muted-foreground sm:block">
            {item.description}
          </p>
        </Link>
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-black md:text-lg">{formatCurrency(item.price)}</p>
          {quantity > 0 ? (
            <div className="flex h-11 items-center rounded-md border bg-background shadow-sm">
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => updateQuantity(item.id, quantity - 1)}
                aria-label={`Decrease ${item.name}`}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center text-sm font-black">{quantity}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => updateQuantity(item.id, quantity + 1)}
                aria-label={`Increase ${item.name}`}
                disabled={item.soldOut}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => addItem(item)}
              aria-label={`Add ${item.name}`}
              disabled={item.soldOut}
              className="rounded-full shadow-sm"
            >
              <Plus className="size-4" />
              {item.soldOut ? "Sold out" : "Add"}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
