import type { FeatureFlagKey } from "../feature-flags/types";
import type { PluginRole } from "../permissions";

export type PluginRouteSurface = "owner" | "admin" | "customer" | "kitchen" | "pos" | "developer";

export type PluginRouteContribution = {
  id: string;
  pluginId: string;
  surface: PluginRouteSurface;
  path: string;
  title: string;
  flag: FeatureFlagKey;
  permissions: PluginRole[];
  load: () => Promise<unknown>;
};

export type PluginNavigationContribution = {
  id: string;
  pluginId: string;
  surface: PluginRouteSurface | "settings" | "dashboard" | "reports" | "tools";
  label: string;
  href: string;
  flag: FeatureFlagKey;
  permissions: PluginRole[];
  healthRequired?: boolean;
  order?: number;
};

class PluginRouterRegistry {
  private routes = new Map<string, PluginRouteContribution>();
  private navigation = new Map<string, PluginNavigationContribution>();

  registerRoute(route: PluginRouteContribution) {
    this.routes.set(route.id, route);
    return () => this.routes.delete(route.id);
  }

  registerNavigation(item: PluginNavigationContribution) {
    this.navigation.set(item.id, item);
    return () => this.navigation.delete(item.id);
  }

  listRoutes(surface?: PluginRouteSurface) {
    return Array.from(this.routes.values()).filter((route) => !surface || route.surface === surface);
  }

  listNavigation(surface?: PluginNavigationContribution["surface"]) {
    return Array.from(this.navigation.values())
      .filter((item) => !surface || item.surface === surface)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  detachPlugin(pluginId: string) {
    for (const [id, route] of this.routes) if (route.pluginId === pluginId) this.routes.delete(id);
    for (const [id, item] of this.navigation) if (item.pluginId === pluginId) this.navigation.delete(id);
  }
}

const pluginRouterRegistry = new PluginRouterRegistry();

export function getPluginRouterRegistry() {
  return pluginRouterRegistry;
}
