"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureException, trackAnalyticsEvent } from "@/services/analytics-service";

let customerVitalsStarted = false;

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const startedAt = performance.now();
    const route = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

    const report = () => {
      void trackAnalyticsEvent("route_performance", {
        route,
        durationMs: Math.round(performance.now() - startedAt),
        source: pathname.startsWith("/instagram") ? "instagram" : "web",
      }).catch((error) => captureException(error, { route }));
    };

    return scheduleIdle(report, 900);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (customerVitalsStarted || !isCustomerRoute(pathname)) return;
    customerVitalsStarted = true;
    return observeCustomerVitals(pathname);
  }, [pathname]);

  return null;
}

function isCustomerRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/restaurants" ||
    pathname.startsWith("/restaurant/") ||
    pathname === "/offers" ||
    pathname === "/checkout" ||
    pathname === "/track-order" ||
    pathname === "/profile"
  );
}

function scheduleIdle(callback: () => void, timeoutMs: number) {
  const win = window as Window & {
    requestIdleCallback?: (handler: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof win.requestIdleCallback === "function") {
    const id = win.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => win.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(callback, timeoutMs);
  return () => window.clearTimeout(id);
}

function observeCustomerVitals(route: string) {
  const observers: PerformanceObserver[] = [];
  const report = (metricName: string, metricValue: number, metricRating: "good" | "needs-improvement" | "poor") => {
    void trackAnalyticsEvent("web_vital", {
      route,
      source: "web",
      metricName,
      metricValue: Math.round(metricValue * 1000) / 1000,
      metricRating,
      navigationType: performance.getEntriesByType("navigation")[0]?.entryType ?? "navigate",
    }).catch((error) => captureException(error, { route, metricName }));
  };

  scheduleIdle(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    if (fcp) report("FCP", fcp.startTime, rateDuration(fcp.startTime, 1800, 3000));
  }, 1200);

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) report("LCP", last.startTime, rateDuration(last.startTime, 2500, 4000));
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    observers.push(lcpObserver);
  } catch {
    // Some older browsers do not expose LCP.
  }

  try {
    let cls = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (!layoutShift.hadRecentInput) cls += layoutShift.value ?? 0;
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    observers.push(clsObserver);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") report("CLS", cls, cls <= 0.1 ? "good" : cls <= 0.25 ? "needs-improvement" : "poor");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observers.forEach((observer) => observer.disconnect());
    };
  } catch {
    return () => observers.forEach((observer) => observer.disconnect());
  }
}

function rateDuration(value: number, good: number, poor: number): "good" | "needs-improvement" | "poor" {
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}
