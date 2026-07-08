"use client";

import { useEffect, useState } from "react";
import { qualityDiagnosticsConfigDefaults } from "../config.defaults";
import { startQualityDiagnostics } from "../services/client-quality-diagnostics";
import type { QualityDiagnosticsSnapshot } from "../types";

export function useQualityDiagnostics(route: string) {
  const [snapshot, setSnapshot] = useState<QualityDiagnosticsSnapshot | null>(null);

  useEffect(() => (
    startQualityDiagnostics({
      route,
      config: qualityDiagnosticsConfigDefaults,
      onSnapshot: setSnapshot,
    })
  ), [route]);

  return snapshot;
}
