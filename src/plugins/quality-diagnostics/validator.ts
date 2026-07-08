import { validatePluginConfig } from "@/plugins/core/config/validator";
import { qualityDiagnosticsConfigDefaults } from "./config.defaults";
import { qualityDiagnosticsConfigSchema, type QualityDiagnosticsConfig } from "./config.schema";

export function validateQualityDiagnosticsConfig(input?: Partial<QualityDiagnosticsConfig>) {
  return validatePluginConfig(
    qualityDiagnosticsConfigSchema,
    qualityDiagnosticsConfigDefaults,
    input,
  );
}
