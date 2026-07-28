"use client";

import { useEffect, useState } from "react";

export function usePersistedOrderFilter<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    const saved = window.localStorage.getItem(key) as T | null;
    return saved && allowed.includes(saved) ? saved : initial;
  });

  useEffect(() => {
    window.localStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
