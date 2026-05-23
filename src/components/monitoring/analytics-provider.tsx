"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureException, trackAnalyticsEvent } from "@/services/analytics-service";

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

    const id = window.setTimeout(report, 0);
    return () => window.clearTimeout(id);
  }, [pathname, searchParams]);

  return null;
}
