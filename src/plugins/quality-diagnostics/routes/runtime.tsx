"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { qualityDiagnosticsConfigDefaults } from "../config.defaults";
import { useQualityDiagnostics } from "../hooks/use-quality-diagnostics";
import { QualityDiagnosticsPanel } from "../ui/quality-diagnostics-panel";

export function QualityDiagnosticsRuntime() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const snapshot = useQualityDiagnostics(route);

  return qualityDiagnosticsConfigDefaults.showPanel ? <QualityDiagnosticsPanel snapshot={snapshot} /> : null;
}
