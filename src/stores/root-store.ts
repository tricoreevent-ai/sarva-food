"use client";

// Root compatibility store. Keep this as the single source of truth until each
// domain slice can be extracted behind tests without changing public behavior.
export { useAppStore } from "@/lib/app-store";
export type { AppStore, PersistedAppStoreState } from "@/lib/app-store";
