"use client";

import { useAppStore, type AppStore } from "@/lib/app-store";
import { bindStoreSelector } from "@/stores/store-utils";

export type OwnerPosStore = Pick<
  AppStore,
  | "authUser"
  | "menuItems"
  | "menuCategories"
  | "cuisines"
  | "taxSettings"
  | "posTables"
  | "posBill"
  | "tableOrders"
  | "printerSettings"
  | "inventoryItems"
  | "loyaltyCustomers"
  | "offlineQueue"
  | "addPosItem"
  | "addPosProduct"
  | "updatePosQuantity"
  | "removePosItem"
  | "setPosBill"
  | "setPosTable"
  | "setPosOrderType"
  | "setPosCustomer"
  | "setPosPayment"
  | "resetPosBill"
  | "upsertLoyaltyCustomerFromBill"
  | "updatePrinterSettings"
  | "queueOfflineAction"
>;

export const useOwnerPosStore = bindStoreSelector<AppStore>(useAppStore);

export const ownerPosStoreSelectors = {
  bill: (state: AppStore) => state.posBill,
  tables: (state: AppStore) => state.posTables,
  menuItems: (state: AppStore) => state.menuItems,
  inventoryItems: (state: AppStore) => state.inventoryItems,
  tableOrders: (state: AppStore) => state.tableOrders,
  offlineQueue: (state: AppStore) => state.offlineQueue,
  addItem: (state: AppStore) => state.addPosItem,
  addProduct: (state: AppStore) => state.addPosProduct,
  resetBill: (state: AppStore) => state.resetPosBill,
};

export type PosStore = OwnerPosStore;
export const usePosStore = useOwnerPosStore;
export const posStoreSelectors = ownerPosStoreSelectors;
