import type { PluginMetadata } from "../metadata/types";

type Discoverer = () => Promise<{ metadata: PluginMetadata } | { qualityDiagnosticsMetadata: PluginMetadata }>;

const localDiscoverers: Discoverer[] = [
  () => import("@/plugins/quality-diagnostics/metadata"),
  () => import("@/plugins/examples/developer-clock/metadata").then((mod) => ({ metadata: mod.developerClockMetadata })),
  () => import("@/plugins/examples/developer-notes/metadata").then((mod) => ({ metadata: mod.developerNotesMetadata })),
  () => import("@/plugins/examples/system-information/metadata").then((mod) => ({ metadata: mod.systemInformationMetadata })),
  () => import("@/plugins/examples/theme-preview/metadata").then((mod) => ({ metadata: mod.themePreviewMetadata })),
];

let cached: PluginMetadata[] | null = null;

export async function discoverLocalPlugins({ incremental = false } = {}) {
  if (cached && incremental) return cached;
  const plugins: PluginMetadata[] = [];
  for (const discover of localDiscoverers) {
    const mod = await discover();
    const metadata = "metadata" in mod ? mod.metadata : mod.qualityDiagnosticsMetadata;
    if (metadata.id.startsWith("core/")) continue;
    plugins.push(metadata);
  }
  cached = plugins;
  return plugins;
}

export function clearPluginDiscoveryCache() {
  cached = null;
}

export function getDiscoveryPlan() {
  return {
    root: "src/plugins",
    skip: ["core"],
    lazy: true,
    incremental: true,
    hotReloadReady: true,
    remoteReady: true,
  };
}
