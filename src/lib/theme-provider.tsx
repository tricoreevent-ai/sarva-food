"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "sarva-theme";

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({
  theme: "light",
  setTheme: () => undefined,
});

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    const saved = readStoredTheme();
    applyTheme(saved);
    void fetch("/api/user/preferences", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { preferences?: { theme?: Theme } } | null) => {
        const next = payload?.preferences?.theme;
        if (next !== "light" && next !== "dark" && next !== "system") return;
        setThemeState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
      })
      .catch(() => undefined);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (readStoredTheme() === "system") applyTheme("system");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: Theme) => {
        setThemeState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
        void fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: next }),
        }).catch(() => undefined);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeContext);
}

export function moduleThemeKey(surface: "customer" | "owner" | "admin", userId = "default") {
  return `sarva-${surface}-theme:${userId || "default"}`;
}
