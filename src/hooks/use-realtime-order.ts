"use client";

import { useEffect, useState } from "react";
import type { OrderDoc } from "@/types/firebase";

export function useRealtimeOrder(orderId?: string) {
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/customer/orders?id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({})) as { data?: OrderDoc; error?: string };
        if (active) {
          setOrder(response.ok ? payload.data ?? null : null);
          setError(response.ok ? "" : payload.error || "Order could not be loaded.");
          setLoading(false);
        }
      } catch (error) {
        console.error("[realtime-order] load failed", error);
        if (active) {
          setOrder(null);
          setError("Order could not be loaded. Check your connection and try again.");
          setLoading(false);
        }
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [orderId]);

  return { order: orderId ? order : null, loading: orderId ? loading : false, error: orderId ? error : "Order id is missing." };
}
