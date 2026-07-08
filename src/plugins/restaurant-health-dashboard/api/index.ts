import type { PluginAPIRequest, PluginAPIResponse } from "@/plugins/core/sdk";
import type { RestaurantHealthSnapshot } from "../types";

export function createRestaurantHealthApiHandler(snapshot: () => RestaurantHealthSnapshot | undefined) {
  return (request: PluginAPIRequest): PluginAPIResponse<RestaurantHealthSnapshot | string> => {
    if (request.action === "snapshot") return { ok: true, value: snapshot() };
    if (request.action === "ping") return { ok: true, value: "restaurant-health-dashboard:ok" };
    return { ok: false, error: `Unsupported action: ${request.action}.` };
  };
}
