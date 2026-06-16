export type AppTheme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "sarva-theme";
export const THEME_COOKIE_NAME = "sarva-theme";

export function normalizeTheme(value?: string | null): AppTheme {
  return value === "dark" || value === "system" ? value : "light";
}

export function isAppTheme(value?: string | null): value is AppTheme {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveThemeMode(theme: AppTheme, prefersDark = false): "light" | "dark" {
  return theme === "dark" || (theme === "system" && prefersDark) ? "dark" : "light";
}
