"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureException, trackAnalyticsEvent } from "@/services/analytics-service";

let customerVitalsStarted = false;
let clientMonitoringStarted = false;

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

  useEffect(() => {
    if (clientMonitoringStarted) return;
    clientMonitoringStarted = true;
    return installClientMonitoring();
  }, []);

  return null;
}

function installClientMonitoring() {
  const cleanupFetch = monitorFetch();
  const cleanupErrors = monitorErrors();
  const cleanupLongTasks = monitorLongTasks();
  return () => {
    cleanupFetch();
    cleanupErrors();
    cleanupLongTasks();
  };
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

function monitorFetch() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const startedAt = performance.now();
    const response = await originalFetch(input, init).catch((error) => {
      const request = requestInfo(input, init);
      void captureException(error, { path: request.path, method: request.method });
      throw error;
    });
    const request = requestInfo(input, init);
    const durationMs = Math.round(performance.now() - startedAt);
    if (request.path.startsWith("/api/") && (!response.ok || durationMs > 2500)) {
      void trackAnalyticsEvent("api_request", {
        path: request.path,
        method: request.method,
        status: response.status,
        ok: response.ok,
        durationMs,
        source: "web",
      }).catch((error) => captureException(error, { path: request.path }));
    }
    return response;
  };
  return () => {
    window.fetch = originalFetch;
  };
}

function monitorErrors() {
  const onError = (event: ErrorEvent) => {
    void trackAnalyticsEvent("client_error", {
      error: String(event.message || "client error").slice(0, 160),
      path: location.pathname,
      source: "web",
    }).catch(() => undefined);
    void captureException(event.error || event.message, { path: location.pathname });
  };
  const onUnhandled = (event: PromiseRejectionEvent) => {
    void captureException(event.reason, { path: location.pathname, unhandled: true });
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandled);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandled);
  };
}

function monitorLongTasks() {
  try {
    const observer = new PerformanceObserver((list) => {
      const worst = list.getEntries().reduce((max, entry) => Math.max(max, entry.duration), 0);
      if (worst > 120) {
        void trackAnalyticsEvent("route_performance", {
          route: location.pathname,
          durationMs: Math.round(worst),
          source: "web",
        }).catch(() => undefined);
      }
    });
    observer.observe({ type: "longtask", buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => undefined;
  }
}

function requestInfo(input: RequestInfo | URL, init?: RequestInit) {
  const method = init?.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
  const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  try {
    const url = new URL(rawUrl, location.origin);
    return { method: method.toUpperCase(), path: url.origin === location.origin ? `${url.pathname}${url.search}` : url.hostname };
  } catch {
    return { method: method.toUpperCase(), path: String(rawUrl).slice(0, 160) };
  }
}

function rateDuration(value: number, good: number, poor: number): "good" | "needs-improvement" | "poor" {
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}
