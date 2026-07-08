import type { PluginDefinition } from "@/plugins/core/lifecycle/types";
import { QUALITY_DIAGNOSTICS_ENV_VAR, QUALITY_DIAGNOSTICS_FEATURE_ID } from "./feature-flag";
import { validateQualityDiagnosticsConfig } from "./validator";

const { config, errors } = validateQualityDiagnosticsConfig();

export const qualityDiagnosticsPlugin = {
  id: QUALITY_DIAGNOSTICS_FEATURE_ID,
  name: "Quality Diagnostics",
  version: "1.0.0",
  flag: QUALITY_DIAGNOSTICS_ENV_VAR,
  permissions: {
    roles: ["developer"],
  },
  config,
  lifecycle: {
    initialize: ({ logger }) => {
      if (errors.length) throw new Error(errors.join(" "));
      logger.debug("initialized");
    },
    enable: ({ logger }) => logger.debug("enabled"),
    disable: ({ logger }) => logger.debug("disabled"),
    suspend: ({ logger }) => logger.debug("suspended"),
    resume: ({ logger }) => logger.debug("resumed"),
    destroy: ({ logger }) => logger.debug("destroyed"),
    healthCheck: () => ({ status: "healthy" }),
    recover: ({ logger }, error) => {
      logger.warning("recovering", {
        reason: error instanceof Error ? error.message : String(error),
      });
    },
  },
} satisfies PluginDefinition<typeof config>;
