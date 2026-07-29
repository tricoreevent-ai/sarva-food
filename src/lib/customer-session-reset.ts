"use client";

import { invalidateCache } from "@/lib/cache";
import { useCartStore } from "@/lib/cart-store";

const exactLocalKeys = [
  "sarva-cart",
  "food-gedi.checkout.preferences:v1",
  "nammude.checkout.preferences:v1",
  "sarva-commerce-location",
  "sarva-commerce-recent-locations",
  "sarva-commerce-location-suggestions",
  "sarva-commerce-gps-prompted-session:v2",
  "sarva-commerce-gps-permission:v1",
];

const orderingTokens = ["cart", "checkout", "restaurant-context", "menu-selection", "coupon", "offer", "payment-draft", "order-draft"];

export async function resetCustomerOrderingSession({ clearRemoteCart = false }: { clearRemoteCart?: boolean } = {}) {
  useCartStore.getState().clearCart();
  useCartStore.persist.clearStorage();
  invalidateCache("public-");
  if (typeof window === "undefined") return;
  clearWebStorage(window.localStorage);
  clearWebStorage(window.sessionStorage);
  await Promise.allSettled([
    clearRemoteCart ? clearServerCart() : Promise.resolve(),
    clearOrderingCaches(),
    deleteOrderingIndexedDb(),
  ]);
}

function clearWebStorage(storage: Storage) {
  for (const key of exactLocalKeys) storage.removeItem(key);
  for (const key of Object.keys(storage)) {
    const normalized = key.toLowerCase();
    if ((normalized.startsWith("sarva") || normalized.startsWith("food-gedi") || normalized.startsWith("nammude")) && orderingTokens.some((token) => normalized.includes(token))) {
      storage.removeItem(key);
    }
  }
}

async function clearServerCart() {
  await fetch("/api/customer/cart", {
    method: "PUT",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-sarva-surface": "customer",
    },
    body: JSON.stringify({ items: [], offerCode: "" }),
  }).catch(() => undefined);
}

async function clearOrderingCaches() {
  if (!("caches" in window)) return;
  const names = await window.caches.keys();
  await Promise.all(names.filter((name) => /cart|checkout|order|restaurant|menu|public/i.test(name)).map((name) => window.caches.delete(name)));
}

async function deleteOrderingIndexedDb() {
  if (!("indexedDB" in window)) return;
  await new Promise<void>((resolve) => {
    const request = window.indexedDB.deleteDatabase("sarva-offline");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
