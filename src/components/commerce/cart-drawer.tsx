"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { getCartTotals, useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";
import { usePublicMenu } from "@/hooks/use-public-data";

export function CartDrawer({ trigger }: { trigger?: React.ReactNode }) {
  const items = useCartStore((state) => state.items);
  const offerCode = useCartStore((state) => state.offerCode);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const { offers } = usePublicMenu(items[0]?.restaurantSlug);
  const totals = getCartTotals(items, offerCode, offers);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="shadow-xl">
            <ShoppingBag className="size-4" />
            View cart
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto flex max-h-[86vh] max-w-2xl flex-col rounded-t-lg pb-6">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>Review dishes, offers, and checkout in a few taps.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto py-5">
          {items.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-lg border border-dashed p-6 text-center">
              <div>
                <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">Cart is empty</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Add a dish from any restaurant menu to preview checkout.
                </p>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="mobile-premium-card rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.price)} x {item.quantity}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-full border bg-background shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label={`Increase ${item.name}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.appliedOffer ? (
              <div className="flex justify-between text-success">
                <span>{totals.appliedOffer.code}</span>
                <span>-{formatCurrency(totals.discount)}</span>
              </div>
            ) : null}
            <Separator />
            <div className="flex justify-between text-lg font-black">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <Button asChild size="lg" className="h-14 w-full rounded-lg shadow-lg" disabled={!items.length}>
            <Link href="/checkout">Checkout</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
