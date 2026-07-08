import type { FeatureFlagKey } from "../feature-flags/types";
import type { PluginRole } from "../permissions";

export type PluginExtensionPoint =
  | "header-actions"
  | "sidebar"
  | "dashboard-cards"
  | "widgets"
  | "panels"
  | "dialogs"
  | "context-menus"
  | "toolbar-actions"
  | "quick-actions"
  | "status-badges"
  | "settings-pages"
  | "reports"
  | "floating-panels";

export type PluginUIContribution = {
  id: string;
  pluginId: string;
  point: PluginExtensionPoint;
  label: string;
  flag: FeatureFlagKey;
  permissions: PluginRole[];
  priority?: number;
  load: () => Promise<unknown>;
};

class PluginUIRegistry {
  private contributions = new Map<string, PluginUIContribution>();

  register(contribution: PluginUIContribution) {
    this.contributions.set(contribution.id, contribution);
    return () => this.contributions.delete(contribution.id);
  }

  list(point?: PluginExtensionPoint) {
    return Array.from(this.contributions.values())
      .filter((contribution) => !point || contribution.point === point)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  detachPlugin(pluginId: string) {
    for (const [id, contribution] of this.contributions) {
      if (contribution.pluginId === pluginId) this.contributions.delete(id);
    }
  }
}

const pluginUIRegistry = new PluginUIRegistry();

export function getPluginUIRegistry() {
  return pluginUIRegistry;
}
