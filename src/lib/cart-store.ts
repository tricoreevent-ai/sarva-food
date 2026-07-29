"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem, Offer } from "@/lib/types";
import { isOfferActive, offerAppliesToFulfillment } from "@/lib/offer-engine";

type CartFulfillment = "delivery" | "parcel" | "dine-in" | "takeaway";

export type CartLine = MenuItem & {
  quantity: number;
};

export type CartState = {
  items: CartLine[];
  offerCode: string;
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  applyOffer: (code: string) => void;
  replaceCart: (items: CartLine[], offerCode?: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      offerCode: "",
      addItem: (item) =>
        set((state) => {
          const compatibleItems = state.items.filter((line) => line.restaurantSlug === item.restaurantSlug);
          const existing = compatibleItems.find((line) => line.id === item.id);

          if (existing) {
            return {
              items: compatibleItems.map((line) =>
                line.id === item.id
                  ? { ...line, quantity: line.quantity + 1 }
                  : line,
              ),
              offerCode: state.items.length === compatibleItems.length ? state.offerCode : "",
            };
          }

          return { items: [...compatibleItems, { ...item, quantity: 1 }], offerCode: state.items.length === compatibleItems.length ? state.offerCode : "" };
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((line) => line.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((line) => line.id !== id)
            : state.items.map((line) =>
                line.id === id ? { ...line, quantity } : line,
              ),
        })),
      applyOffer: (code) => set({ offerCode: code.trim().toUpperCase() }),
      replaceCart: (items, offerCode = "") => set({ items: sanitizeCartLines(items), offerCode: offerCode.trim().toUpperCase() }),
      clearCart: () => set({ items: [], offerCode: "" }),
    }),
    {
      name: "sarva-cart",
      version: 2,
      migrate: () => ({ items: [], offerCode: "" }),
      partialize: (state) => ({ items: state.items, offerCode: state.offerCode }),
    },
  ),
);

function sanitizeCartLines(items: CartLine[]) {
  return items
    .filter((item) => item.id && item.name && Number.isFinite(item.price) && Number.isFinite(item.quantity))
    .map((item) => ({ ...item, quantity: Math.max(1, Math.min(99, Math.round(item.quantity))) }));
}

export function getCartSubtotal(items: CartLine[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function findAppliedOffer(items: CartLine[], offerCode: string, offers: Offer[] = [], fulfillment: CartFulfillment = "delivery") {
  const code = offerCode.trim().toUpperCase();
  if (!code || !items.length) return null;
  const subtotal = getCartSubtotal(items);
  return offers.find((offer) => {
    if (offer.code.toUpperCase() !== code) return false;
    if (!isOfferActive(offer)) return false;
    if (subtotal < offer.minimumOrder) return false;
    if (!offerAppliesToFulfillment(offer, fulfillment)) return false;
    if (offer.applicableItemIds?.length && !items.some((item) => offer.applicableItemIds?.includes(item.id))) return false;
    if (offer.applicableCategories?.length && !items.some((item) => offer.applicableCategories?.includes(item.category))) return false;
    return true;
  }) ?? null;
}

export function getCartTotals(items: CartLine[], offerCode: string, offers: Offer[] = [], fulfillment: CartFulfillment = "delivery") {
  const subtotal = getCartSubtotal(items);
  const appliedOffer = findAppliedOffer(items, offerCode, offers, fulfillment);
  const rawDiscount = appliedOffer
    ? appliedOffer.discountType === "flat" || appliedOffer.offerType === "flat"
      ? Math.min(subtotal, appliedOffer.discount)
      : appliedOffer.discountType === "free-delivery" || appliedOffer.offerType === "free-delivery"
        ? 0
        : Math.round(subtotal * (appliedOffer.discount / 100))
    : 0;
  const discount = appliedOffer?.maxDiscount ? Math.min(rawDiscount, appliedOffer.maxDiscount) : rawDiscount;
  const deliveryFee = appliedOffer?.discountType === "free-delivery" || appliedOffer?.offerType === "free-delivery" || subtotal > 499 || subtotal === 0 ? 0 : 39;
  const tax = Math.round((subtotal - discount) * 0.05);

  return {
    subtotal,
    discount,
    deliveryFee,
    tax,
    total: Math.max(0, subtotal - discount + deliveryFee + tax),
    appliedOffer,
  };
}
