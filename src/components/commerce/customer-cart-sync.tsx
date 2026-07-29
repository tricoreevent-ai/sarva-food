"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useAppStore } from "@/lib/app-store";
import { type CartLine, useCartStore } from "@/lib/cart-store";
import { resetCustomerOrderingSession } from "@/lib/customer-session-reset";

const CART_SYNC_DEBOUNCE_MS = 600;
const CUSTOMER_SESSION_KEY = "sarva-customer-session:v1";

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
      window.localStorage.removeItem(CUSTOMER_SESSION_KEY);
      void resetCustomerOrderingSession();
      return;
    }

    let active = true;
    hydratedCustomerRef.current = null;
    const previousCustomerId = window.localStorage.getItem(CUSTOMER_SESSION_KEY);
    const shouldReset = previousCustomerId !== customerId;
    void (shouldReset ? resetCustomerOrderingSession({ clearRemoteCart: true }) : Promise.resolve())
      .then(() => {
        if (!active) return;
        window.localStorage.setItem(CUSTOMER_SESSION_KEY, customerId);
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
