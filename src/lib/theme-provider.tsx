"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isAppTheme, normalizeTheme, resolveThemeMode, THEME_COOKIE_NAME, THEME_STORAGE_KEY, type AppTheme } from "@/lib/theme";

const ThemeContext = createContext<{ theme: AppTheme; setTheme: (theme: AppTheme) => void }>({
  theme: "light",
  setTheme: () => undefined,
});

function applyTheme(theme: AppTheme) {
  const dark = resolveThemeMode(theme, window.matchMedia("(prefers-color-scheme: dark)").matches) === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
}

function persistTheme(theme: AppTheme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(theme)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function readStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function ThemeProvider({ children, initialTheme = "light" }: { children: React.ReactNode; initialTheme?: AppTheme }) {
  const [theme, setThemeState] = useState<AppTheme>(() =>
    typeof document === "undefined" ? initialTheme : normalizeTheme(document.documentElement.dataset.theme || initialTheme),
  );

  useEffect(() => {
    const saved = normalizeTheme(document.documentElement.dataset.theme || readStoredTheme());
    persistTheme(saved);
    applyTheme(saved);
    void fetch("/api/user/preferences", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { preferences?: { theme?: AppTheme } } | null) => {
        if (!isAppTheme(payload?.preferences?.theme)) return;
        const next = payload.preferences.theme;
        if (next === saved) return;
        setThemeState(next);
        persistTheme(next);
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
      setTheme: (next: AppTheme) => {
        setThemeState(next);
        persistTheme(next);
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
