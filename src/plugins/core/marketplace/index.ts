import type { PluginMetadata } from "../metadata/types";

export type MarketplacePlugin = PluginMetadata & {
  downloads: number;
  rating: number;
  publisher: string;
  installSource: "local" | "marketplace" | "private";
  versions: string[];
  updateAvailable: boolean;
};

type MarketplaceQuery = {
  search?: string;
  category?: string;
  sort?: "name" | "rating" | "downloads";
};

class MockMarketplaceProvider {
  constructor(private plugins: MarketplacePlugin[] = []) {}

  setPlugins(plugins: MarketplacePlugin[]) {
    this.plugins = plugins;
  }

  available(query: MarketplaceQuery = {}) {
    const search = query.search?.toLowerCase() ?? "";
    const filtered = this.plugins.filter((plugin) => (
      (!search || [plugin.displayName, plugin.description, ...plugin.keywords].join(" ").toLowerCase().includes(search)) &&
      (!query.category || plugin.category === query.category)
    ));
    return filtered.sort((a, b) => {
      if (query.sort === "rating") return b.rating - a.rating;
      if (query.sort === "downloads") return b.downloads - a.downloads;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  installed() {
    return this.plugins.filter((plugin) => plugin.status === "installed" || plugin.status === "enabled");
  }

  updates() {
    return this.plugins.filter((plugin) => plugin.updateAvailable);
  }
}

const marketplaceProvider = new MockMarketplaceProvider();

export function getPluginMarketplace() {
  return marketplaceProvider;
}
