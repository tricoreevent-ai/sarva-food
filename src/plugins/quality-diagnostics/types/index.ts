import type { QUALITY_DIAGNOSTICS_FEATURE_ID } from "../feature-flag";
import type { QualityDiagnosticsConfig } from "../config.schema";

export type QualityDiagnosticsRating = "ok" | "watch" | "critical";

export type QualityDiagnosticsSnapshot = {
  featureId: typeof QUALITY_DIAGNOSTICS_FEATURE_ID;
  route: string;
  startedAtMs: number;
  generatedAtMs: number;
  longTaskCount: number;
  worstLongTaskMs: number;
  usedHeapMb?: number;
  heapLimitMb?: number;
  rating: QualityDiagnosticsRating;
};

export type QualityDiagnosticsOptions = {
  route: string;
  config: QualityDiagnosticsConfig;
  onSnapshot: (snapshot: QualityDiagnosticsSnapshot) => void;
};
