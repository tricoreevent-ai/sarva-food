"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCartTotals, useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";
import { usePublicMenu } from "@/hooks/use-public-data";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const offerCode = useCartStore((state) => state.offerCode);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const { offers } = usePublicMenu(items[0]?.restaurantSlug);
  const totals = getCartTotals(items, offerCode, offers);

  return (
    <CustomerShell>
      <main className="container-page space-y-5 py-5">
        <section className="customer-hero-gradient rounded-lg p-5 text-white shadow-xl">
          <p className="text-xs font-black uppercase">Cart</p>
          <h1 className="mt-2 text-4xl font-black leading-none">Review your order</h1>
          <p className="mt-3 text-sm font-semibold text-white/86">Cart stays saved locally for weak network and PWA sessions.</p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {items.length ? items.map((item) => (
              <Card key={item.id} className="mobile-premium-card">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-black">{item.name}</p>
                    <p className="text-sm font-semibold text-muted-foreground">{formatCurrency(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-full border bg-background">
                      <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus className="size-4" />
                      </Button>
                      <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                      <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card className="mobile-premium-card">
                <CardContent className="grid min-h-64 place-items-center p-8 text-center">
                  <div>
                    <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-black">Your cart is empty</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Add dishes from a restaurant menu to start checkout.</p>
                    <Button asChild className="mt-5">
                      <Link href="/restaurants">Browse restaurants</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="mobile-premium-card h-fit">
            <CardContent className="space-y-4 p-5">
              <h2 className="text-xl font-black">Bill summary</h2>
              <div className="space-y-2 text-sm font-semibold">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>{formatCurrency(totals.deliveryFee)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(totals.tax)}</span></div>
                {totals.appliedOffer ? <div className="flex justify-between text-success"><span>{totals.appliedOffer.code}</span><span>-{formatCurrency(totals.discount)}</span></div> : null}
                <Separator />
                <div className="flex justify-between text-lg font-black"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
              </div>
              <Button asChild size="lg" className="w-full" disabled={!items.length}>
                <Link href="/checkout">Checkout</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </CustomerShell>
  );
}
