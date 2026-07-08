import type { QualityDiagnosticsConfig } from "./config.schema";

export const qualityDiagnosticsConfigDefaults = {
  sampleMs: 30_000,
  showPanel: true,
  longTaskWarningMs: 120,
  longTaskCriticalMs: 500,
  memoryWarningRatio: 0.55,
  memoryCriticalRatio: 0.7,
} satisfies QualityDiagnosticsConfig;
