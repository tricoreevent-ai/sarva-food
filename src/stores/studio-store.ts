"use client";

import { useAppStore, type AppStore } from "@/lib/app-store";
import { bindStoreSelector } from "@/stores/store-utils";

export type StudioStore = Pick<
  AppStore,
  | "authUser"
  | "templates"
  | "socialPosts"
  | "restaurants"
  | "branches"
  | "offers"
  | "createSocialPost"
  | "reviewSocialPost"
>;

export const useStudioStore = bindStoreSelector<AppStore>(useAppStore);

export const studioStoreSelectors = {
  authUser: (state: AppStore) => state.authUser,
  templates: (state: AppStore) => state.templates,
  socialPosts: (state: AppStore) => state.socialPosts,
  restaurants: (state: AppStore) => state.restaurants,
  createSocialPost: (state: AppStore) => state.createSocialPost,
  reviewSocialPost: (state: AppStore) => state.reviewSocialPost,
};
