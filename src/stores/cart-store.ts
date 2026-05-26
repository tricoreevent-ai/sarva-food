"use client";

import {
  findAppliedOffer,
  getCartSubtotal,
  getCartTotals,
  useCartStore,
} from "@/lib/cart-store";

export type { CartLine, CartState } from "@/lib/cart-store";

// Customer cart compatibility entrypoint. This reuses the existing persisted
// cart store so the `sarva-cart` hydration and localStorage key stay unchanged.
export { findAppliedOffer, getCartSubtotal, getCartTotals, useCartStore };

export const cartStoreSelectors = {
  items: (state: import("@/lib/cart-store").CartState) => state.items,
  offerCode: (state: import("@/lib/cart-store").CartState) => state.offerCode,
  addItem: (state: import("@/lib/cart-store").CartState) => state.addItem,
  removeItem: (state: import("@/lib/cart-store").CartState) => state.removeItem,
  updateQuantity: (state: import("@/lib/cart-store").CartState) => state.updateQuantity,
  applyOffer: (state: import("@/lib/cart-store").CartState) => state.applyOffer,
  clearCart: (state: import("@/lib/cart-store").CartState) => state.clearCart,
};
