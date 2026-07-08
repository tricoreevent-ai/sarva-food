export type PluginAssetType = "icon" | "image" | "font" | "svg" | "animation" | "translation" | "theme" | "manifest";

export type PluginAsset = {
  id: string;
  pluginId: string;
  type: PluginAssetType;
  version: string;
  href: string;
  integrity?: string;
  locale?: string;
};

class PluginAssetRegistry {
  private assets = new Map<string, PluginAsset>();

  register(asset: PluginAsset) {
    this.assets.set(asset.id, asset);
    return () => this.assets.delete(asset.id);
  }

  resolve(id: string) {
    return this.assets.get(id);
  }

  list(pluginId?: string) {
    return Array.from(this.assets.values()).filter((asset) => !pluginId || asset.pluginId === pluginId);
  }

  detachPlugin(pluginId: string) {
    for (const [id, asset] of this.assets) if (asset.pluginId === pluginId) this.assets.delete(id);
  }
}

const pluginAssetRegistry = new PluginAssetRegistry();

export function getPluginAssetRegistry() {
  return pluginAssetRegistry;
}
