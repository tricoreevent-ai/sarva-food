"use client";

import { useEffect, useMemo, useState } from "react";
import { parseFirestoreDateMillis } from "@/lib/firestore-date";
import { listenToRestaurantOrders } from "@/services/order-service";
import type { OrderDoc, OrderStatus } from "@/types/firebase";

export function useRestaurantOrders(restaurantId?: string | string[], statuses?: OrderStatus[]) {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(Boolean(restaurantId));
  const statusKey = statuses?.join(",") ?? "new,accepted,preparing,ready";
  const restaurantIds = useMemo(
    () => Array.from(new Set((Array.isArray(restaurantId) ? restaurantId : [restaurantId]).filter((id): id is string => Boolean(id)))),
    [restaurantId],
  );
  const restaurantKey = restaurantIds.join(",");
  const stableStatuses = useMemo(
    () => statusKey.split(",") as OrderStatus[],
    [statusKey],
  );

  useEffect(() => {
    if (!restaurantIds.length) {
      const resetTimer = window.setTimeout(() => {
        setOrders([]);
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    const loadingTimer = window.setTimeout(() => setLoading(true), 0);
    const scopedOrders = new Map<string, OrderDoc[]>();
    const emit = () => {
      setOrders(dedupeOrders([...scopedOrders.values()].flat()));
      setLoading(false);
    };
    const unsubscribers = restaurantIds.map((id) => listenToRestaurantOrders(id, stableStatuses, (nextOrders) => {
      scopedOrders.set(id, nextOrders);
      emit();
    }));
    return () => {
      window.clearTimeout(loadingTimer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [restaurantIds, restaurantKey, stableStatuses]);

  return { orders: restaurantIds.length ? orders : [], loading: restaurantIds.length ? loading : false };
}

function dedupeOrders(orders: OrderDoc[]) {
  return Array.from(new Map(orders.map((order) => [order.id, order])).values()).sort((first, second) => {
    return orderCreatedAtMs(second.createdAt) - orderCreatedAtMs(first.createdAt);
  });
}

function orderCreatedAtMs(value: unknown) {
  return parseFirestoreDateMillis(value);
}
