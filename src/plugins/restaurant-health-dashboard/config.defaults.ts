import type { PluginConfig } from "@/plugins/core/sdk";

export type RestaurantHealthDashboardConfig = {
  enabled: boolean;
  refreshIntervalSeconds: number;
  retentionSnapshots: number;
  showDeveloperSignals: boolean;
  allowClipboardExport: boolean;
  storageMode: "memory" | "session" | "persistent" | "encrypted";
};

export const restaurantHealthDashboardConfigDefaults = {
  enabled: false,
  refreshIntervalSeconds: 30,
  retentionSnapshots: 25,
  showDeveloperSignals: true,
  allowClipboardExport: false,
  storageMode: "memory",
} satisfies RestaurantHealthDashboardConfig;

export const restaurantHealthDashboardConfig = {
  defaults: restaurantHealthDashboardConfigDefaults,
} satisfies PluginConfig<RestaurantHealthDashboardConfig>;
