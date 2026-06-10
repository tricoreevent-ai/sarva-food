"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobilePullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [startY, setStartY] = useState<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const visible = pull > 0 || refreshing;

  function resetSoon() {
    window.setTimeout(() => {
      setRefreshing(false);
      setPull(0);
    }, 700);
  }

  return (
    <div
      onTouchStart={(event) => {
        if (isTextEntryTarget(event.target)) {
          setStartY(null);
          return;
        }
        if (window.scrollY <= 0) {
          setStartY(event.touches[0]?.clientY ?? null);
        }
      }}
      onTouchMove={(event) => {
        if (startY === null || window.scrollY > 0) return;
        const nextPull = Math.max(0, Math.min(96, (event.touches[0]?.clientY ?? startY) - startY));
        setPull(nextPull);
      }}
      onTouchEnd={() => {
        if (pull > 72) {
          setRefreshing(true);
          router.refresh();
          resetSoon();
        } else {
          setPull(0);
        }
        setStartY(null);
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center transition-[opacity,transform] duration-200 md:hidden"
        style={{ opacity: visible ? 1 : 0, transform: `translateY(${visible ? 0 : -72}px)` }}
      >
        <div className="glass-card flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black shadow-xl">
          <RefreshCw className={cn("size-4 text-primary", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing" : "Pull to refresh"}
        </div>
      </div>
      {children}
    </div>
  );
}

function isTextEntryTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true'], [role='textbox'], [role='combobox'], [role='searchbox']"));
}

export function MobileOfflineBanner() {
  const [mounted, setMounted] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const initialStateTimer = window.setTimeout(() => {
      setMounted(true);
      setOnline(navigator.onLine);
    }, 0);
    const update = () => setOnline(navigator.onLine);

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.clearTimeout(initialStateTimer);
    };
  }, []);

  if (!mounted || online) return null;

  return (
    <div className="fixed inset-x-3 top-3 z-50 md:left-auto md:right-5 md:w-96">
      <div className="glass-card flex items-center justify-between gap-3 rounded-lg border p-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-primary/12 text-primary">
            {online ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
          </div>
          <div>
            <p className="text-sm font-black">Offline mode</p>
            <p className="text-xs font-semibold text-muted-foreground">
              Reconnect to refresh live restaurant data and sync your signed-in cart.
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setMounted(false)}>
          OK
        </Button>
      </div>
    </div>
  );
}
