import type { PluginUI } from "@/plugins/core/sdk";
import type { RestaurantHealthPermissionAudit, RestaurantHealthRuntimeAudit, RestaurantHealthSnapshot } from "../types";

export function createExtensionPayload(
  point: PluginUI["point"],
  snapshot: RestaurantHealthSnapshot,
  permissions: RestaurantHealthPermissionAudit,
  runtime: RestaurantHealthRuntimeAudit,
) {
  return {
    plugin: snapshot.pluginId,
    point,
    state: {
      loading: false,
      empty: snapshot.signals.length === 0,
      error: snapshot.status === "failed",
      permissionDenied: !permissions.admin.visible && !permissions.developer.visible,
      disabled: snapshot.healthScore <= 0,
      lazyLoaded: true,
      responsive: true,
      darkMode: snapshot.theme === "system",
      keyboardNavigation: true,
      touchInteraction: true,
    },
    summary: {
      status: snapshot.status,
      healthScore: snapshot.healthScore,
      routes: snapshot.routes,
      extensionPoints: snapshot.extensionPoints,
      storageModes: snapshot.storage.map((item) => item.mode),
    },
    runtime,
    permissions,
  };
}
