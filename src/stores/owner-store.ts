"use client";

import { useAppStore, type AppStore } from "@/lib/app-store";
import { bindStoreSelector } from "@/stores/store-utils";

export type OwnerStore = Pick<
  AppStore,
  | "authUser"
  | "restaurants"
  | "branches"
  | "ownerBusinessProfile"
  | "businessApplications"
  | "menuItems"
  | "menuCategories"
  | "cuisines"
  | "comboOffers"
  | "menuSchedules"
  | "taxSettings"
  | "offers"
  | "orders"
  | "tableOrders"
  | "posTables"
  | "inventoryItems"
  | "purchases"
  | "suppliers"
  | "staffMembers"
  | "loyaltyCustomers"
  | "transactions"
  | "chartAccounts"
  | "expenses"
  | "cateringInquiries"
  | "printerSettings"
  | "offlineQueue"
  | "saveOwnerBusinessProfile"
  | "submitBusinessApplication"
  | "createMenuItem"
  | "updateMenuItem"
  | "deleteMenuItem"
  | "toggleSoldOut"
  | "createMenuCategory"
  | "updateMenuCategory"
  | "deleteMenuCategory"
  | "createCuisine"
  | "updateCuisine"
  | "deleteCuisine"
  | "updateTaxSettings"
  | "createComboOffer"
  | "updateComboOffer"
  | "deleteComboOffer"
  | "createOffer"
  | "updateOffer"
  | "deleteOffer"
  | "updateRestaurantCapabilities"
  | "createStaffMember"
  | "updateStaffMember"
  | "upsertPosTable"
  | "deletePosTable"
  | "updateInventoryItem"
  | "deleteInventoryItem"
  | "updatePrinterSettings"
  | "queueOfflineAction"
  | "updateCateringInquiryStatus"
  | "convertCateringInquiryToOrder"
>;

export const useOwnerStore = bindStoreSelector<AppStore>(useAppStore);

export const ownerStoreSelectors = {
  authUser: (state: AppStore) => state.authUser,
  restaurant: (state: AppStore) => state.restaurants[0],
  branch: (state: AppStore) => state.branches[0],
  businessProfile: (state: AppStore) => state.ownerBusinessProfile,
  menuItems: (state: AppStore) => state.menuItems,
  menuCategories: (state: AppStore) => state.menuCategories,
  orders: (state: AppStore) => state.orders,
  tableOrders: (state: AppStore) => state.tableOrders,
  tables: (state: AppStore) => state.posTables,
  inventoryItems: (state: AppStore) => state.inventoryItems,
  staffMembers: (state: AppStore) => state.staffMembers,
  offers: (state: AppStore) => state.offers,
  saveBusinessProfile: (state: AppStore) => state.saveOwnerBusinessProfile,
};
