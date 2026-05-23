"use client";

import { useEffect, useMemo, useState } from "react";
import { listenToRestaurantOrders } from "@/services/order-service";
import type { OrderDoc, OrderStatus } from "@/types/firebase";

export function useRestaurantOrders(restaurantId?: string, statuses?: OrderStatus[]) {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(Boolean(restaurantId));
  const statusKey = statuses?.join(",") ?? "new,accepted,preparing,ready";
  const stableStatuses = useMemo(
    () => statusKey.split(",") as OrderStatus[],
    [statusKey],
  );

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    return listenToRestaurantOrders(restaurantId, stableStatuses, (nextOrders) => {
      setOrders(nextOrders);
      setLoading(false);
    });
  }, [restaurantId, stableStatuses]);

  return { orders: restaurantId ? orders : [], loading: restaurantId ? loading : false };
}
