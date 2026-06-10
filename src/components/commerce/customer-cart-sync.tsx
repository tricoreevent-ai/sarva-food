"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useAppStore } from "@/lib/app-store";
import { type CartLine, useCartStore } from "@/lib/cart-store";

type CartApiPayload = {
  data?: {
    items?: CartLine[];
    offerCode?: string;
  };
};

const CART_SYNC_DEBOUNCE_MS = 600;

export function CustomerCartSync() {
  const auth = useAuthUser();
  const localAuthUser = useAppStore((state) => state.authUser);
  const hydratedCustomerRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const customerId = useMemo(() => {
    if (auth.profile?.role === "customer") return auth.profile.uid || auth.profile.id || auth.user?.uid || null;
    if (auth.user && auth.profile?.role !== "owner" && auth.profile?.role !== "admin") return auth.user.uid;
    if (localAuthUser.role === "customer" && localAuthUser.id !== "anonymous") return localAuthUser.id;
    return null;
  }, [auth.profile, auth.user, localAuthUser.id, localAuthUser.role]);

  useEffect(() => {
    if (!customerId) {
      hydratedCustomerRef.current = null;
      return;
    }

    let active = true;
    hydratedCustomerRef.current = null;
    void fetch("/api/customer/cart", {
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "x-sarva-surface": "customer",
      },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Cart sync unavailable.");
        return response.json() as Promise<CartApiPayload>;
      })
      .then((payload) => {
        if (!active) return;
        const remoteItems = Array.isArray(payload.data?.items) ? payload.data.items : [];
        const remoteOfferCode = payload.data?.offerCode ?? "";
        const current = useCartStore.getState();
        if (remoteItems.length || !current.items.length) {
          current.replaceCart(remoteItems, remoteOfferCode);
        } else {
          void saveCart(current.items, current.offerCode);
        }
        hydratedCustomerRef.current = customerId;
      })
      .catch(() => {
        if (active) hydratedCustomerRef.current = customerId;
      });

    return () => {
      active = false;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return undefined;
    const unsubscribe = useCartStore.subscribe((state) => {
      if (hydratedCustomerRef.current !== customerId) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void saveCart(state.items, state.offerCode);
      }, CART_SYNC_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [customerId]);

  return null;
}

async function saveCart(items: CartLine[], offerCode: string) {
  await fetch("/api/customer/cart", {
    method: "PUT",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-sarva-surface": "customer",
    },
    body: JSON.stringify({ items, offerCode }),
  }).catch(() => undefined);
}
