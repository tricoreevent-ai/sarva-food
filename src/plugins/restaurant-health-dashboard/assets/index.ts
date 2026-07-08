import type { PluginAssets } from "@/plugins/core/sdk";

export function restaurantHealthDashboardAssets(pluginId: string, version: string): PluginAssets[] {
  return [
    {
      id: `${pluginId}:icon`,
      pluginId,
      type: "svg",
      version,
      href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%230f766e' d='M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4Zm0 4 5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V8l5-2Z'/%3E%3C/svg%3E",
    },
    {
      id: `${pluginId}:manifest`,
      pluginId,
      type: "manifest",
      version,
      href: "restaurant-health-dashboard",
    },
  ];
}
