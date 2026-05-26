"use client";

import { useAppStore, type AppStore } from "@/lib/app-store";
import { bindStoreSelector } from "@/stores/store-utils";

export type DeliveryStore = Pick<
  AppStore,
  | "authUser"
  | "orders"
  | "deliveries"
  | "restaurants"
  | "branches"
  | "updateDeliveryStatus"
  | "verifyDeliveryOtp"
  | "updateOrderStatus"
>;

export const useDeliveryStore = bindStoreSelector<AppStore>(useAppStore);

export const deliveryStoreSelectors = {
  authUser: (state: AppStore) => state.authUser,
  orders: (state: AppStore) => state.orders,
  deliveries: (state: AppStore) => state.deliveries,
  restaurants: (state: AppStore) => state.restaurants,
  updateDeliveryStatus: (state: AppStore) => state.updateDeliveryStatus,
  verifyDeliveryOtp: (state: AppStore) => state.verifyDeliveryOtp,
};
