"use client";

import { useEffect, useState } from "react";
import { CaseSensitive, MonitorSmartphone, Palette } from "lucide-react";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Button } from "@/components/ui/button";
import { useThemeMode } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

type FontScale = "comfortable" | "large" | "compact";

const FONT_KEY = "sarva-font-scale";
const fontOptions: Array<{ value: FontScale; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Normal" },
  { value: "large", label: "Large" },
];

export function AppPreferences({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useThemeMode();
  const [fontScale, setFontScale] = useState<FontScale>(() => {
    if (typeof window === "undefined") return "comfortable";
    const saved = window.localStorage.getItem(FONT_KEY) as FontScale | null;
    return saved && fontOptions.some((item) => item.value === saved) ? saved : "comfortable";
  });

  useEffect(() => {
    window.localStorage.setItem(FONT_KEY, fontScale);
    document.documentElement.setAttribute("data-font-scale", fontScale);
  }, [fontScale]);

  function changeFontScale(next: FontScale) {
    setFontScale(next);
  }

  return (
    <div className={cn("grid gap-3", compact && "gap-2")}>
      <section className="rounded-lg border bg-orange-50/70 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-black">
            <Palette className="size-4 text-primary" />
            Theme color
          </p>
          <InfoTooltip label="Choose how Sarva Food looks on this device. System follows your browser or phone setting." />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["light", "dark", "system"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={theme === item ? "default" : "outline"}
              className="h-9 text-xs capitalize"
              onClick={() => setTheme(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-black">
            <CaseSensitive className="size-4 text-primary" />
            App font size
          </p>
          <InfoTooltip label="Increase text size for easier reading across the customer app. This setting is saved on this device." />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {fontOptions.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={fontScale === item.value ? "default" : "outline"}
              className="h-9 text-xs"
              onClick={() => changeFontScale(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-black">
            <MonitorSmartphone className="size-4 text-primary" />
            Fullscreen
          </p>
          <InfoTooltip label="Best for mobile ordering counters, tablets, and desktop kiosk-style browsing." />
        </div>
        <FullscreenToggle compact />
      </section>
    </div>
  );
}
