"use client";

import { useAppStore, type AppStore } from "@/lib/app-store";
import { bindStoreSelector } from "@/stores/store-utils";

export type PosStore = Pick<
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
  | "linkPosKitchenOrder"
  | "setPosPayment"
  | "payPosBill"
  | "resetPosBill"
  | "upsertLoyaltyCustomerFromBill"
  | "createTableOrder"
  | "updateTableOrder"
  | "updateTableOrderStatus"
  | "updatePrinterSettings"
  | "queueOfflineAction"
>;

export const usePosStore = bindStoreSelector<AppStore>(useAppStore);

export const posStoreSelectors = {
  bill: (state: AppStore) => state.posBill,
  tables: (state: AppStore) => state.posTables,
  menuItems: (state: AppStore) => state.menuItems,
  inventoryItems: (state: AppStore) => state.inventoryItems,
  tableOrders: (state: AppStore) => state.tableOrders,
  offlineQueue: (state: AppStore) => state.offlineQueue,
  addItem: (state: AppStore) => state.addPosItem,
  addProduct: (state: AppStore) => state.addPosProduct,
  payBill: (state: AppStore) => state.payPosBill,
  resetBill: (state: AppStore) => state.resetPosBill,
};
