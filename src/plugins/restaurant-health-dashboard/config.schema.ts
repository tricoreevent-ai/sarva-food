import type { PluginConfigSchema } from "@/plugins/core/sdk";
import type { RestaurantHealthDashboardConfig } from "./config.defaults";

export const restaurantHealthDashboardConfigSchema = {
  version: 1,
  fields: {
    enabled: { type: "boolean", required: true },
    refreshIntervalSeconds: { type: "number", required: true, min: 5, max: 300 },
    retentionSnapshots: { type: "number", required: true, min: 1, max: 100 },
    showDeveloperSignals: { type: "boolean", required: true },
    allowClipboardExport: { type: "boolean", required: true },
    storageMode: { type: "string", required: true },
  },
} satisfies PluginConfigSchema<RestaurantHealthDashboardConfig>;
