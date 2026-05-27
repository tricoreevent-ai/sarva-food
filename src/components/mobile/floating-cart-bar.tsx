"use client";

import { ArrowRight, ShoppingBag } from "lucide-react";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { Button } from "@/components/ui/button";
import { usePublicMenu } from "@/hooks/use-public-data";
import { getCartTotals, useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";

export function FloatingCartBar() {
  const items = useCartStore((state) => state.items);
  const offerCode = useCartStore((state) => state.offerCode);
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const { offers } = usePublicMenu(items[0]?.restaurantSlug);
  const totals = getCartTotals(items, offerCode, offers);

  if (!count) return null;

  return (
    <div className="fixed inset-x-4 bottom-[5.75rem] z-40 md:hidden">
      <CartDrawer
        trigger={
          <Button type="button" size="lg" className="h-14 w-full rounded-lg shadow-2xl">
            <ShoppingBag className="size-5" />
            <span className="mr-auto">{count} items</span>
            <span>{formatCurrency(totals.total)}</span>
            <ArrowRight className="size-5" />
          </Button>
        }
      />
    </div>
  );
}
