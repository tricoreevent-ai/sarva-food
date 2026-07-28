"use client";

import type { OrderLine, OrderTotals } from "@/lib/types";

export async function placeCustomerOrder(input: {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryGeo?: { lat: number; lng: number };
  deliveryPlaceId?: string;
  deliveryAddressLabel?: string;
  lines: OrderLine[];
  totals: OrderTotals;
  offerCode?: string;
  fulfillmentType?: "delivery" | "parcel";
  scheduleMode?: "now" | "scheduled";
  scheduledFor?: string;
  guestCount?: number;
  acceptedTermsVersion?: string;
}) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      restaurantId: input.restaurantId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      deliveryAddress: input.deliveryAddress,
      deliveryGeo: input.deliveryGeo,
      deliveryPlaceId: input.deliveryPlaceId,
      deliveryAddressLabel: input.deliveryAddressLabel,
      lines: input.lines.map((line) => ({ menuItemId: line.itemId, name: line.name, price: line.price, quantity: line.quantity, notes: line.notes })),
      offerCode: input.offerCode,
      subtotal: input.totals.subtotal,
      discount: input.totals.discount,
      tax: input.totals.tax,
      deliveryFee: input.totals.deliveryFee,
      total: input.totals.total,
      fulfillmentType: input.fulfillmentType,
      scheduleMode: input.scheduleMode,
      scheduledFor: input.scheduledFor,
      guestCount: input.guestCount,
      acceptedTermsVersion: input.acceptedTermsVersion ?? "current",
      acceptedTermsAt: new Date().toISOString(),
    }),
  });
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; orderId?: string; verificationId?: string; error?: string };
  if (!response.ok || !payload.ok || !payload.orderId) throw new Error(payload.error || "Unable to create order right now.");
  return { id: payload.orderId, verificationId: payload.verificationId };
}
