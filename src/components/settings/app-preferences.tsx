"use client";

import { useEffect, useState } from "react";
import { CaseSensitive, MonitorSmartphone } from "lucide-react";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FontScale = "comfortable" | "large" | "compact";

const FONT_KEY = "sarva-font-scale";
const fontOptions: Array<{ value: FontScale; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Normal" },
  { value: "large", label: "Large" },
];

export function AppPreferences({ compact = false }: { compact?: boolean }) {
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
              size={compact ? "icon" : "sm"}
              variant={fontScale === item.value ? "default" : "outline"}
              className={cn("h-9 text-xs", compact && "w-full")}
              onClick={() => changeFontScale(item.value)}
              title={`Set app font size to ${item.label}`}
              aria-label={`Set app font size to ${item.label}`}
            >
              <CaseSensitive className={item.value === "compact" ? "size-3.5" : item.value === "large" ? "size-5" : "size-4"} />
              {!compact ? <span>{item.label}</span> : null}
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
