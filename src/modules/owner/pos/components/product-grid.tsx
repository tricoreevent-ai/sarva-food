import { memo, useEffect, useMemo, useState } from "react";
import { ProductCard, type PosProduct } from "@/modules/owner/pos/components/product-card";
import { Button } from "@/components/ui/button";

function ProductGridComponent({
  items,
  quantities,
  onAdd,
  onQuantity,
  compact = false,
  showImages = true,
  viewMode = "grid",
  showDescription = true,
  touchMode = "compact",
}: {
  items: PosProduct[];
  quantities: Record<string, number>;
  onAdd: (item: PosProduct) => void;
  onQuantity: (item: PosProduct, quantity: number) => void;
  compact?: boolean;
  showImages?: boolean;
  viewMode?: "grid" | "list";
  showDescription?: boolean;
  touchMode?: "large" | "compact";
}) {
  const rowMode = viewMode === "list" || !showImages;
  const pageSize = rowMode ? 96 : showImages ? 48 : 72;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisibleCount(pageSize));
    return () => window.cancelAnimationFrame(frame);
  }, [items, pageSize]);
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

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
    <div className="p-3">
      <div className={rowMode ? "grid gap-2" : compact ? "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6" : "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"}>
        {visibleItems.map((item) => (
          <ProductCard
            key={`${item.source}-${item.id}`}
            item={item}
            quantity={quantities[item.id] ?? 0}
            onAdd={() => onAdd(item)}
            onQuantity={(quantity) => onQuantity(item, quantity)}
            showImages={showImages}
            showDescription={showDescription}
            layout={rowMode ? "row" : "grid"}
            touchMode={touchMode}
          />
        ))}
      </div>
      {visibleCount < items.length ? (
        <div className="mt-3 grid place-items-center">
          <Button type="button" variant="outline" onClick={() => setVisibleCount((current) => Math.min(items.length, current + pageSize))}>
            Show {Math.min(pageSize, items.length - visibleCount)} more items
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export const ProductGrid = memo(ProductGridComponent, (prev, next) => (
  prev.items === next.items &&
  prev.quantities === next.quantities &&
  prev.compact === next.compact &&
  prev.showImages === next.showImages &&
  prev.viewMode === next.viewMode &&
  prev.showDescription === next.showDescription &&
  prev.touchMode === next.touchMode &&
  prev.onAdd === next.onAdd &&
  prev.onQuantity === next.onQuantity
));
