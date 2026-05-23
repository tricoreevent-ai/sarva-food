"use client";

import { useMemo } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getCartTotals, useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";
import { usePublicMenu } from "@/hooks/use-public-data";

export function WhatsAppOrderFlow() {
  const items = useCartStore((state) => state.items);
  const offerCode = useCartStore((state) => state.offerCode);
  const { offers } = usePublicMenu(items[0]?.restaurantSlug);
  const totals = getCartTotals(items, offerCode, offers);

  const message = useMemo(() => {
    const lines = items
      .map((item) => `- ${item.name} x${item.quantity}: ${formatCurrency(item.price * item.quantity)}`)
      .join("\n");

    return [
      "Hi, I want to place this order:",
      lines || "- I am still choosing dishes",
      totals.appliedOffer ? `Offer: ${totals.appliedOffer.code}` : "",
      `Total preview: ${formatCurrency(totals.total)}`,
      "Please confirm availability and payment link.",
    ]
      .filter(Boolean)
      .join("\n");
  }, [items, totals.appliedOffer, totals.total]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="lg" variant="outline">
          <MessageCircle className="size-4" />
          WhatsApp order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WhatsApp order summary</DialogTitle>
          <DialogDescription>
            Prefilled message with the same cart totals as checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3">
            <pre className="whitespace-pre-wrap text-sm leading-6">{message}</pre>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Button asChild disabled={!items.length}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Send className="size-4" />
                Open WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
