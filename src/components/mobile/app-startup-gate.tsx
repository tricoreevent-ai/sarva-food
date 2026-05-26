"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Database, Wifi, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { getFirebaseApp, isFirebaseConfigured } from "@/firebase/client";
import { useAppStore } from "@/lib/app-store";
import { startOfflineSyncEngine } from "@/lib/offline";
import { getInitials } from "@/lib/utils";

const SPLASH_SEEN_KEY = "sarva-startup-splash-seen";

export function AppStartupGate() {
  const pathname = usePathname();
  const productName = useAppStore((state) => state.cmsSettings.appName?.trim() || "Sarva Food");
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("Starting mobile app");
  const [online, setOnline] = useState(true);
  const operationalPath = (pathname === "/owner" || pathname.startsWith("/owner/") || pathname.startsWith("/pos")) && pathname !== "/owner/login";

  useEffect(() => {
    if (navigator.webdriver || window.location.search.includes("visual-check=1")) {
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
      if (operationalPath) startOfflineSyncEngine();
      return;
    }

    const seen = window.sessionStorage.getItem(SPLASH_SEEN_KEY);

    const timers = [
      window.setTimeout(() => {
        setOnline(navigator.onLine);
        if (!seen) setVisible(true);
      }, 0),
      window.setTimeout(() => setLabel("Restoring offline database"), 180),
      window.setTimeout(() => {
        try {
          if (isFirebaseConfigured) getFirebaseApp();
          setLabel("Connecting to Firebase");
        } catch {
          setLabel("Using offline-ready mode");
        }
      }, 420),
      window.setTimeout(() => {
        if (operationalPath) {
          startOfflineSyncEngine();
          setLabel(navigator.onLine ? "Ready for orders" : "Offline queue ready");
          return;
        }
        setLabel("Ready");
      }, 720),
      window.setTimeout(() => {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
        setVisible(false);
      }, seen ? 0 : 1250),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [operationalPath]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="customer-theme fixed inset-0 z-[100] grid place-items-center bg-background px-6"
        >
          <motion.div
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="grid w-full max-w-xs justify-items-center gap-5 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1], rotate: [0, -2, 2, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              className="food-gradient grid size-24 place-items-center rounded-lg text-3xl font-black text-white shadow-2xl"
            >
              {getInitials(productName)}
            </motion.div>
            <div>
              <h1 className="text-3xl font-black">{productName}</h1>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">{label}</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full food-gradient"
                initial={{ width: "12%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.15, ease: "easeOut" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-muted-foreground">
              <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
              <Database className="size-5 text-primary" aria-hidden="true" />
              {online ? (
                <Wifi className="size-5 text-primary" aria-hidden="true" />
              ) : (
                <WifiOff className="size-5 text-primary" aria-hidden="true" />
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
