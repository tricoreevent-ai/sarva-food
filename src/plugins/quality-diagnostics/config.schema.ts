import type { PluginConfigSchema } from "@/plugins/core/config/types";

export type QualityDiagnosticsConfig = {
  sampleMs: number;
  showPanel: boolean;
  longTaskWarningMs: number;
  longTaskCriticalMs: number;
  memoryWarningRatio: number;
  memoryCriticalRatio: number;
};

export const qualityDiagnosticsConfigSchema = {
  version: 1,
  fields: {
    sampleMs: { type: "number", required: true, min: 5000, max: 120_000 },
    showPanel: { type: "boolean", required: true },
    longTaskWarningMs: { type: "number", required: true, min: 50, max: 5000 },
    longTaskCriticalMs: { type: "number", required: true, min: 100, max: 10_000 },
    memoryWarningRatio: { type: "number", required: true, min: 0.1, max: 0.95 },
    memoryCriticalRatio: { type: "number", required: true, min: 0.1, max: 0.98 },
  },
} satisfies PluginConfigSchema<QualityDiagnosticsConfig>;
