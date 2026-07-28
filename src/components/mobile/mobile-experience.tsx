"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChefHat,
  ClipboardList,
  Download,
  RefreshCw,
  ReceiptText,
  Router,
  ShoppingBag,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { BrandIcon } from "@/components/brand/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePublicMenu } from "@/hooks/use-public-data";
import { usePublicAppName } from "@/hooks/use-public-app-name";
import { getCartTotals, useCartStore } from "@/lib/cart-store";
import { cn, formatCurrency } from "@/lib/utils";

export function MobilePullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [startY, setStartY] = useState<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center md:hidden"
        animate={{ y: pull > 0 || refreshing ? 0 : -72, opacity: pull > 0 || refreshing ? 1 : 0 }}
      >
        <div className="glass-card flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black shadow-xl">
          <RefreshCw className={cn("size-4 text-primary", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing" : "Pull to refresh"}
        </div>
      </motion.div>
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

export function FloatingCartBar() {
  const items = useCartStore((state) => state.items);
  const offerCode = useCartStore((state) => state.offerCode);
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const { offers } = usePublicMenu(items[0]?.restaurantSlug);
  const totals = getCartTotals(items, offerCode, offers);

  if (!count) return null;

  return (
    <div className="fixed inset-x-4 bottom-[5.75rem] z-40 md:hidden">
      <CartDrawer
        trigger={
          <Button type="button" size="lg" className="h-14 w-full rounded-lg shadow-2xl">
            <ShoppingBag className="size-5" />
            <span className="mr-auto">{count} items</span>
            <span>{formatCurrency(totals.total)}</span>
            <ArrowRight className="size-5" />
          </Button>
        }
      />
    </div>
  );
}

export function DashboardQuickActions({ app }: { app: "owner" | "pos" | "admin" | "delivery" | "studio" | "catering" }) {
  const actions = useMemo(() => {
    if (app === "owner") {
      return [
        { href: "/owner/orders", label: "Orders", icon: ClipboardList },
        { href: "/owner/kitchen", label: "Kitchen", icon: ChefHat },
        { href: "/owner/pos", label: "POS", icon: ReceiptText },
      ];
    }
    if (app === "pos") {
      return [
        { href: "/owner/pos", label: "Bill", icon: ReceiptText },
        { href: "/owner/tables", label: "Tables", icon: ClipboardList },
        { href: "/owner/kitchen", label: "Kitchen", icon: ChefHat },
      ];
    }
    return [];
  }, [app]);

  if (!actions.length) return null;

  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 grid grid-cols-3 gap-2 rounded-lg border bg-card/92 p-2 shadow-2xl backdrop-blur-xl lg:hidden safe-bottom" aria-label="Quick actions">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.href} href={action.href} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-black text-muted-foreground transition active:scale-95 hover:bg-muted hover:text-foreground">
            <Icon className="size-5 text-primary" />
            {action.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PremiumSplash() {
  const router = useRouter();
  const productName = usePublicAppName();
  const [progress, setProgress] = useState(8);
  const [networkLabel, setNetworkLabel] = useState("Checking connection");
  const [installReady, setInstallReady] = useState(false);

  useEffect(() => {
    const networkTimer = window.setTimeout(() => {
      setNetworkLabel(navigator.onLine ? "Online and ready" : "Offline queue ready");
    }, 0);
    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(100, current + 11));
    }, 140);
    const redirectTimer = window.setTimeout(() => router.replace("/"), 1900);
    const promptListener = () => setInstallReady(true);
    window.addEventListener("beforeinstallprompt", promptListener);

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(networkTimer);
      window.clearTimeout(redirectTimer);
      window.removeEventListener("beforeinstallprompt", promptListener);
    };
  }, [router]);

  return (
    <main className="customer-theme grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <motion.section
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative w-full max-w-md overflow-hidden rounded-lg border bg-card/82 p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-1 food-gradient" />
        <div className="space-y-7">
          <div className="grid justify-items-center gap-4 text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, -2, 2, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="grid size-24 place-items-center"
            >
              <BrandIcon className="size-24" priority sizes="96px" />
            </motion.div>
            <div>
              <Badge className="mb-3 bg-primary/10 text-primary">
                <Sparkles className="mr-1 size-3" />
                {productName}
              </Badge>
              <h1 className="text-4xl font-black tracking-normal">Food, orders, POS.</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Loading the mobile app shell, cached menus, and sync engine.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full food-gradient" animate={{ width: `${progress}%` }} />
            </div>
            <div className="grid gap-2 text-xs font-bold text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Router className="size-4 text-primary" />
                  {networkLabel}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Download className="size-4 text-primary" />
                  {installReady ? "Install prompt ready" : "PWA assets warming"}
                </span>
                <span>Offline first</span>
              </div>
            </div>
          </div>

          <Button type="button" size="lg" className="w-full rounded-lg" onClick={() => router.replace("/")}>
            Open app
            <ArrowRight className="size-5" />
          </Button>
        </div>
      </motion.section>
    </main>
  );
}
