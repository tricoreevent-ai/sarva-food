"use client";

import { useEffect, useMemo, useState } from "react";
import { Maximize2, Minimize2, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const FULLSCREEN_PREFERENCE_KEY = "sarva-fullscreen-preferred";

export function FullscreenToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const doc = document as FullscreenDocument;
    const canFullscreen = Boolean(document.fullscreenEnabled || doc.webkitFullscreenEnabled);
    const standaloneMode = window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    function syncState() {
      setActive(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    }

    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      setSupported(canFullscreen);
      setStandalone(standaloneMode);
      syncState();
    });

    document.addEventListener("fullscreenchange", syncState);
    document.addEventListener("webkitfullscreenchange", syncState);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("fullscreenchange", syncState);
      document.removeEventListener("webkitfullscreenchange", syncState);
    };
  }, []);

  const helperText = useMemo(() => {
    if (!mounted) return "Checking browser support...";
    if (standalone) return "Already running in app-style fullscreen mode.";
    if (!supported) return "This browser does not allow app fullscreen here. On iPhone, use Add to Home Screen for the closest app view.";
    if (active) return "Fullscreen is active. Use the same button or your browser gesture to exit.";
    return "Best for mobile ordering counters, tablets, and desktop kiosk-style browsing.";
  }, [active, mounted, standalone, supported]);

  async function toggleFullscreen() {
    setMessage("");
    const doc = document as FullscreenDocument;
    const element = document.documentElement as FullscreenElement;

    if (standalone) {
      setMessage("Already in app view.");
      return;
    }

    if (!supported) {
      setMessage("Fullscreen is not available in this browser.");
      return;
    }

    try {
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          await doc.webkitExitFullscreen?.();
        }
        window.localStorage.setItem(FULLSCREEN_PREFERENCE_KEY, "off");
        setMessage("Fullscreen turned off.");
        return;
      }

      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else {
        await element.webkitRequestFullscreen?.();
      }
      window.localStorage.setItem(FULLSCREEN_PREFERENCE_KEY, "on");
      setMessage("Fullscreen turned on.");
    } catch {
      setMessage("Your browser blocked fullscreen. Tap the button again or check browser permissions.");
    }
  }

  return (
    <div className={cn(compact ? "rounded-md bg-transparent" : "rounded-md border bg-card p-3", className)}>
      <div className="flex items-start gap-3">
        <span className={cn("grid shrink-0 place-items-center rounded-full bg-primary/10 text-primary", compact ? "size-9" : "size-10")}>
          <MonitorSmartphone className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black">{compact ? "App view" : "Fullscreen app view"}</p>
              {!compact ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{helperText}</p> : null}
            </div>
            <Button
              type="button"
              size={compact ? "icon" : "default"}
              variant={active ? "outline" : "default"}
              onClick={toggleFullscreen}
              disabled={!mounted || standalone}
              className={cn("w-full sm:w-auto", compact && "size-9")}
              title={helperText}
              aria-label={active ? "Exit fullscreen app view" : "Enter fullscreen app view"}
            >
              {active ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              {!compact ? (active ? "Exit fullscreen" : "Enter fullscreen") : null}
            </Button>
          </div>
          {message ? <p className="mt-2 text-xs font-bold text-primary">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
