import type { RestaurantHealthDashboardConfig } from "../config.defaults";

export function createSettingsRoute(config: RestaurantHealthDashboardConfig) {
  return {
    title: "Restaurant Health Settings",
    fields: [
      { id: "enabled", type: "toggle", value: config.enabled },
      { id: "refreshIntervalSeconds", type: "number", value: config.refreshIntervalSeconds },
      { id: "retentionSnapshots", type: "number", value: config.retentionSnapshots },
      { id: "storageMode", type: "select", value: config.storageMode },
    ],
  };
}
