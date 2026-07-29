"use client";

import type { OrderLine, OrderTotals } from "@/lib/types";

export class CustomerOrderError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "CustomerOrderError";
  }
}

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
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; orderId?: string; verificationId?: string; error?: string; code?: string };
  if (!response.ok || !payload.ok || !payload.orderId) {
    throw new CustomerOrderError(customerOrderMessage(payload.error, response.status), response.status, payload.code);
  }
  return { id: payload.orderId, verificationId: payload.verificationId };
}

function customerOrderMessage(message: string | undefined, status: number) {
  const text = message?.trim();
  if (text) return text;
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 409) return "Restaurant is not accepting orders right now.";
  if (status === 422) return "Please review your cart and delivery details.";
  if (status >= 500) return "Unable to connect to the restaurant. Please try again in a moment.";
  return "Order could not be created. Please review your details and try again.";
}
