"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCartTotals, useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";
import { usePublicMenu } from "@/hooks/use-public-data";

export function CheckoutSummary() {
  const items = useCartStore((state) => state.items);
  const offerCode = useCartStore((state) => state.offerCode);
  const applyOffer = useCartStore((state) => state.applyOffer);
  const [draftCode, setDraftCode] = useState(offerCode);
  const { offers } = usePublicMenu(items[0]?.restaurantSlug);
  const totals = getCartTotals(items, offerCode, offers);

  return (
    <Card className="customer-surface lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="text-2xl font-black">Order summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.length ? (
            items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span>
                  {item.name} x {item.quantity}
                </span>
                <span className="font-semibold">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Cart items will appear here after you add dishes from a restaurant menu.
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-secondary/12 p-3">
          <Label htmlFor="offer-code" className="flex items-center gap-2">
            <Tag className="size-4" aria-hidden="true" />
            Offer code
          </Label>
          <div className="mt-3 flex gap-2">
            <Input
              id="offer-code"
              value={draftCode}
              onChange={(event) => setDraftCode(event.target.value)}
              placeholder="Enter offer code"
              autoCapitalize="characters"
            />
            <Button type="button" onClick={() => applyOffer(draftCode)}>
              Apply
            </Button>
          </div>
          {totals.appliedOffer ? (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              {totals.appliedOffer.code} applied
            </p>
          ) : offerCode ? (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <AlertCircle className="size-3" aria-hidden="true" />
              Offer not available for this cart
            </p>
          ) : null}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discount ? (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>-{formatCurrency(totals.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{totals.deliveryFee ? formatCurrency(totals.deliveryFee) : "Free"}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxes</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-xl font-black">
            <span>Payable</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
