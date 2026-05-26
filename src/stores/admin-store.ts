"use client";

import { useAppStore, type AppStore } from "@/lib/app-store";
import { bindStoreSelector } from "@/stores/store-utils";

export type AdminStore = Pick<
  AppStore,
  | "authUser"
  | "restaurants"
  | "businessApplications"
  | "cmsSettings"
  | "socialPosts"
  | "staffMembers"
  | "orders"
  | "transactions"
  | "apiPhase"
  | "apiMessage"
  | "setAuthUser"
  | "reviewBusinessApplication"
  | "updateCmsSettings"
  | "reviewSocialPost"
>;

export const useAdminStore = bindStoreSelector<AppStore>(useAppStore);

export const adminStoreSelectors = {
  authUser: (state: AppStore) => state.authUser,
  restaurants: (state: AppStore) => state.restaurants,
  businessApplications: (state: AppStore) => state.businessApplications,
  cmsSettings: (state: AppStore) => state.cmsSettings,
  socialPosts: (state: AppStore) => state.socialPosts,
  apiPhase: (state: AppStore) => state.apiPhase,
  setAuthUser: (state: AppStore) => state.setAuthUser,
  reviewBusinessApplication: (state: AppStore) => state.reviewBusinessApplication,
};
