"use client";

import { useEffect, useState } from "react";
import type { OrderDoc } from "@/types/firebase";

export function useRealtimeOrder(orderId?: string) {
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const load = async () => {
      const response = await fetch(`/api/customer/orders?id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { data?: OrderDoc };
      if (active) {
        setOrder(response.ok ? payload.data ?? null : null);
        setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [orderId]);

  return { order: orderId ? order : null, loading: orderId ? loading : false };
}
