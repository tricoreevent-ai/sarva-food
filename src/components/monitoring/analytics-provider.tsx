"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureException, trackAnalyticsEvent } from "@/services/analytics-service";

let customerVitalsStarted = false;
let clientMonitoringStarted = false;
const runtimeDiagnosticsEnabled = process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_DIAGNOSTICS !== "false";

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!runtimeDiagnosticsEnabled) return;
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
    if (!runtimeDiagnosticsEnabled) return;
    if (customerVitalsStarted || !isCustomerRoute(pathname)) return;
    customerVitalsStarted = true;
    return observeCustomerVitals(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!runtimeDiagnosticsEnabled) return;
    if (clientMonitoringStarted) return;
    clientMonitoringStarted = true;
    let cleanup: (() => void) | undefined;
    const cancel = scheduleIdle(() => {
      cleanup = installClientMonitoring();
    }, 1400);
    return () => {
      cancel();
      cleanup?.();
    };
  }, []);

  return null;
}

function installClientMonitoring() {
  const cleanupFetch = monitorFetch();
  const cleanupErrors = monitorErrors();
  const cleanupLongTasks = monitorLongTasks();
  const cleanupBrowserPerformance = monitorBrowserPerformance();
  return () => {
    cleanupFetch();
    cleanupErrors();
    cleanupLongTasks();
    cleanupBrowserPerformance();
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
  let lastLcp = 0;
  let cls = 0;
  let reportedFinal = false;
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

  const cancelFcp = scheduleIdle(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    if (fcp) report("FCP", fcp.startTime, rateDuration(fcp.startTime, 1800, 3000));
  }, 1200);

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) lastLcp = last.startTime;
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    observers.push(lcpObserver);
  } catch {
    // Some older browsers do not expose LCP.
  }

  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (!layoutShift.hadRecentInput) cls += layoutShift.value ?? 0;
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    observers.push(clsObserver);
  } catch {
    // CLS is unavailable in some browsers.
  }

  try {
    const eventObserver = new PerformanceObserver((list) => {
      const worst = list.getEntries().reduce((max, entry) => {
        const eventEntry = entry as PerformanceEntry & { interactionId?: number; processingStart?: number; startTime: number; duration: number };
        if (!eventEntry.interactionId) return max;
        const latency = Math.max(eventEntry.duration, (eventEntry.processingStart ?? eventEntry.startTime) - eventEntry.startTime);
        return Math.max(max, latency);
      }, 0);
      if (worst > 0) report("INP", worst, rateDuration(worst, 200, 500));
    });
    eventObserver.observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    observers.push(eventObserver);
  } catch {
    // Event Timing is not universally available.
  }

  const reportFinal = () => {
    if (reportedFinal) return;
    reportedFinal = true;
    if (lastLcp) report("LCP", lastLcp, rateDuration(lastLcp, 2500, 4000));
    report("CLS", cls, cls <= 0.1 ? "good" : cls <= 0.25 ? "needs-improvement" : "poor");
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") reportFinal();
  };
  window.addEventListener("pagehide", reportFinal);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    cancelFcp();
    window.removeEventListener("pagehide", reportFinal);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    observers.forEach((observer) => observer.disconnect());
  };
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
  const originalConsoleError = console.error;
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
  console.error = (...args: unknown[]) => {
    const text = args.map((item) => typeof item === "string" ? item : "").join(" ");
    if (/hydration|did not match|server rendered html/i.test(text)) {
      void trackAnalyticsEvent("client_error", {
        error: "hydration warning",
        path: location.pathname,
        source: "web",
      }).catch(() => undefined);
    }
    if (process.env.NODE_ENV !== "production") originalConsoleError(...args);
  };
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandled);
    console.error = originalConsoleError;
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

function monitorBrowserPerformance() {
  const cleanups = [monitorFps(), monitorPageLoad(), monitorMemory()];
  return () => cleanups.forEach((cleanup) => cleanup());
}

function monitorFps() {
  let frames = 0;
  let raf = 0;
  const started = performance.now();
  const tick = () => {
    frames += 1;
    if (performance.now() - started < 3000) {
      raf = window.requestAnimationFrame(tick);
      return;
    }
    const fps = Math.round((frames * 1000) / Math.max(1, performance.now() - started));
    void trackAnalyticsEvent("route_performance", {
      route: location.pathname,
      metricName: "FPS",
      metricValue: fps,
      source: "web",
    }).catch(() => undefined);
  };
  raf = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame(raf);
}

function monitorPageLoad() {
  const cancel = scheduleIdle(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;
    void trackAnalyticsEvent("route_performance", {
      route: location.pathname,
      metricName: "page_load",
      metricValue: Math.round(nav.loadEventEnd || nav.duration),
      durationMs: Math.round(nav.duration),
      source: "web",
    }).catch(() => undefined);
    void trackAnalyticsEvent("route_performance", {
      route: location.pathname,
      metricName: "hydration",
      metricValue: Math.round(performance.now()),
      source: "web",
    }).catch(() => undefined);
  }, 1800);
  return cancel;
}

function monitorMemory() {
  const perf = performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };
  if (!perf.memory) return () => undefined;
  const id = window.setInterval(() => {
    const usedMb = Math.round(perf.memory!.usedJSHeapSize / 1024 / 1024);
    const limitMb = Math.round(perf.memory!.jsHeapSizeLimit / 1024 / 1024);
    if (usedMb > Math.max(256, limitMb * 0.65)) void trackAnalyticsEvent("route_performance", {
      route: location.pathname,
      metricName: "memory",
      metricValue: usedMb,
      source: "web",
    }).catch(() => undefined);
  }, 30_000);
  return () => window.clearInterval(id);
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
