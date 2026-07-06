"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { showSarvaNotification } from "@/components/ui/app-toaster";
import { playOperationalSound, type OperationalSound } from "@/lib/operational-sounds";
import {
  listenForForegroundPush,
  normalizePushPayload,
  refreshPushTokenIfNeeded,
  type PushSurface,
} from "@/services/fcm-client";

export function PushNotificationProvider() {
  const pathname = usePathname();
  const router = useRouter();
  const surface = surfaceForPath(pathname);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    const start = () => {
      void refreshPushTokenIfNeeded(surface);
      void listenForForegroundPush((payload) => {
        if (!active) return;
        const notification = normalizePushPayload(payload);
        void setAppBadge(notification.badge);
        void playOperationalSound({ sound: notification.sound as OperationalSound, volume: 0.65, repeatCount: notification.tone === "critical" ? 2 : 1 }).catch(() => undefined);
        showSarvaNotification({
          tone: notification.tone,
          title: notification.title,
          message: notification.body,
          actions: notification.link
            ? [{ label: "Open", variant: "primary", onClick: () => router.push(notification.link) }]
            : undefined,
        });
      }).then((unsubscribe) => {
        cleanup = unsubscribe;
      }).catch(() => undefined);
    };

    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof win.requestIdleCallback === "function") {
      const id = win.requestIdleCallback(start, { timeout: 3000 });
      return () => {
        active = false;
        win.cancelIdleCallback?.(id);
        cleanup?.();
      };
    }

    const id = window.setTimeout(start, 1200);
    return () => {
      active = false;
      window.clearTimeout(id);
      cleanup?.();
    };
  }, [router, surface]);

  return null;
}

function surfaceForPath(pathname: string): PushSurface {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/owner/kitchen")) return "kitchen";
  if (pathname.startsWith("/owner/pos") || pathname.startsWith("/pos")) return "pos";
  if (pathname.startsWith("/owner/tables")) return "waiter";
  if (pathname.startsWith("/owner")) return "owner";
  return "customer";
}

async function setAppBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (contents?: number) => Promise<void> };
  if (typeof nav.setAppBadge !== "function") return;
  await nav.setAppBadge(Math.max(1, Math.min(99, count))).catch(() => undefined);
}
