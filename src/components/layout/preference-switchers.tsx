"use client";

import { Languages, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, type Locale } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme-provider";

export function PreferenceSwitchers() {
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useThemeMode();

  return (
    <div className="flex items-center gap-1">
      <select
        aria-label="Language"
        className="h-9 rounded-md border bg-background px-2 text-xs font-bold"
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        <option value="en">EN</option>
        <option value="hi">HI</option>
        <option value="ml">ML</option>
      </select>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Moon className="size-4" />
      </Button>
      <Languages className="hidden size-4 text-muted-foreground sm:block" />
    </div>
  );
}
