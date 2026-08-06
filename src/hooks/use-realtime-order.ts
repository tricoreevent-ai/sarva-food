"use client";

import { useEffect, useState } from "react";
import { captureException } from "@/services/analytics-service";
import { fetchWithTimeout } from "@/lib/client-fetch";
import type { OrderDoc } from "@/types/firebase";

export function useRealtimeOrder(orderId?: string) {
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchWithTimeout(`/api/customer/orders?id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({})) as { data?: OrderDoc; error?: string };
        if (active) {
          setOrder(response.ok ? payload.data ?? null : null);
          setError(response.ok ? "" : payload.error || "Order could not be loaded.");
          setLoading(false);
        }
      } catch (error) {
        void captureException(error, { surface: "realtime-order-load" });
        if (active) {
          setOrder(null);
          setError("Order could not be loaded. Check your connection and try again.");
          setLoading(false);
        }
      }
    };
    void load();
    void import("@/services/order-service").then(({ listenToOrder }) => {
      if (!active) return;
      unsubscribe = listenToOrder(orderId, (nextOrder) => {
        if (!active || !nextOrder) return;
        setOrder(nextOrder);
        setError("");
        setLoading(false);
      });
    }).catch((error) => {
      void captureException(error, { surface: "realtime-order-subscription" });
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [orderId]);

  return { order: orderId ? order : null, loading: orderId ? loading : false, error: orderId ? error : "Order id is missing." };
}
