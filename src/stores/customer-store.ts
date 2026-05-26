"use client";

import { useAppStore, type AppStore } from "@/lib/app-store";
import { bindStoreSelector } from "@/stores/store-utils";

export type CustomerStore = Pick<
  AppStore,
  | "authUser"
  | "restaurants"
  | "menuItems"
  | "menuCategories"
  | "cuisines"
  | "offers"
  | "orders"
  | "loyaltyCustomers"
  | "cateringInquiries"
  | "cmsSettings"
  | "latestQuote"
  | "apiPhase"
  | "apiMessage"
  | "setAuthUser"
  | "createOrder"
  | "updateOrderStatus"
  | "createCateringQuote"
>;

export const useCustomerStore = bindStoreSelector<AppStore>(useAppStore);

export const customerStoreSelectors = {
  authUser: (state: AppStore) => state.authUser,
  restaurants: (state: AppStore) => state.restaurants,
  menuItems: (state: AppStore) => state.menuItems,
  offers: (state: AppStore) => state.offers,
  orders: (state: AppStore) => state.orders,
  cmsSettings: (state: AppStore) => state.cmsSettings,
  createOrder: (state: AppStore) => state.createOrder,
  setAuthUser: (state: AppStore) => state.setAuthUser,
};
