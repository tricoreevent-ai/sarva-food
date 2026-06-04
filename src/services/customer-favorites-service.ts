"use client";

import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { COLLECTIONS } from "@/firebase/collections";
import { shouldUseFirebase } from "@/lib/env";
import type { Restaurant } from "@/lib/types";

export type FavoriteRestaurantInput = Pick<Restaurant, "id" | "slug" | "name" | "image" | "cuisine" | "rating" | "deliveryTime">;

export function customerFavoriteId(customerId: string, restaurant: Pick<Restaurant, "id" | "slug"> | string) {
  const restaurantKey = typeof restaurant === "string" ? restaurant : restaurant.slug || restaurant.id;
  return `${customerId}-${restaurantKey}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export async function saveCustomerFavoriteRestaurant(customerId: string, restaurant: FavoriteRestaurantInput) {
  if (!canUseCustomerFavorites()) throw new Error("Customer favorites are available after Firebase is configured.");
  const id = customerFavoriteId(customerId, restaurant);
  await setDoc(doc(getFirebaseDb(), COLLECTIONS.customerSavedRestaurants, id), {
    id,
    customerId,
    restaurantId: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    image: restaurant.image,
    cuisine: restaurant.cuisine,
    rating: restaurant.rating,
    deliveryTime: restaurant.deliveryTime,
    savedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteCustomerFavoriteRestaurant(favoriteId: string) {
  if (!canUseCustomerFavorites()) throw new Error("Customer favorites are available after Firebase is configured.");
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.customerSavedRestaurants, favoriteId));
}

function canUseCustomerFavorites() {
  return shouldUseFirebase() && isFirebaseConfigured && typeof window !== "undefined";
}
