"use client";

import { useEffect, useState } from "react";
import { listenToOrder } from "@/services/order-service";
import type { OrderDoc } from "@/types/firebase";

export function useRealtimeOrder(orderId?: string) {
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) {
      return;
    }

    return listenToOrder(orderId, (nextOrder) => {
      setOrder(nextOrder);
      setLoading(false);
    });
  }, [orderId]);

  return { order: orderId ? order : null, loading: orderId ? loading : false };
}
