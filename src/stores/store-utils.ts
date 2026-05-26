"use client";

export type StoreSelector<TStore, TSelected> = (state: TStore) => TSelected;
export type StoreHook<TStore> = <TSelected>(selector: StoreSelector<TStore, TSelected>) => TSelected;

/**
 * Migration-safe selector binder for domain stores.
 * It keeps the existing Zustand store instance, persistence key, and hydration
 * behavior intact while exposing smaller domain-specific entrypoints.
 */
export function bindStoreSelector<TStore>(useStore: StoreHook<TStore>) {
  return function useDomainStore<TSelected>(selector: StoreSelector<TStore, TSelected>) {
    return useStore(selector);
  };
}
