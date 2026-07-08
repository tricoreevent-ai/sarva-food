import { validatePluginConfig } from "@/plugins/core/config/validator";
import { restaurantHealthDashboardConfigDefaults, type RestaurantHealthDashboardConfig } from "./config.defaults";
import { restaurantHealthDashboardConfigSchema } from "./config.schema";

const storageModes = ["memory", "session", "persistent", "encrypted"];

export function validateRestaurantHealthDashboardConfig(input: Partial<RestaurantHealthDashboardConfig> = {}) {
  const result = validatePluginConfig(
    restaurantHealthDashboardConfigSchema,
    restaurantHealthDashboardConfigDefaults,
    input,
  );
  if (!storageModes.includes(result.config.storageMode)) {
    result.errors.push("storageMode must be memory, session, persistent, or encrypted.");
  }
  return result;
}

export function validateRestaurantHealthDashboardPlugin() {
  const result = validateRestaurantHealthDashboardConfig();
  return {
    passed: result.errors.length === 0,
    warnings: [],
    errors: result.errors,
  };
}
