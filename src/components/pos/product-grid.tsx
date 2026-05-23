"use client";

import { ProductCard, type PosProduct } from "@/components/pos/product-card";

export function ProductGrid({
  items,
  quantities,
  onAdd,
  onQuantity,
  compact = false,
}: {
  items: PosProduct[];
  quantities: Record<string, number>;
  onAdd: (item: PosProduct) => void;
  onQuantity: (item: PosProduct, quantity: number) => void;
  compact?: boolean;
}) {
  if (!items.length) {
    return (
      <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <div>
          <p className="font-black text-slate-950">No items found</p>
          <p className="mt-1 text-sm text-slate-500">Try another category or search term.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "grid gap-3 p-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"}>
      {items.map((item) => (
        <ProductCard
          key={`${item.source}-${item.id}`}
          item={item}
          quantity={quantities[item.id] ?? 0}
          onAdd={() => onAdd(item)}
          onQuantity={(quantity) => onQuantity(item, quantity)}
        />
      ))}
    </div>
  );
}
