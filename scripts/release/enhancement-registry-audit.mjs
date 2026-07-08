import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = [
  "src/plugins/registry.ts",
  "src/plugins/runtime/enhancement-runtime.tsx",
  "src/plugins/core/lifecycle/types.ts",
  "src/plugins/core/lifecycle/manager.ts",
  "src/plugins/core/feature-flags/types.ts",
  "src/plugins/core/feature-flags/index.ts",
  "src/plugins/core/events/index.ts",
  "src/plugins/core/logger/index.ts",
  "src/plugins/core/profiler/index.ts",
  "src/plugins/core/error-isolation/plugin-error-boundary.tsx",
  "src/plugins/core/permissions/index.ts",
  "src/plugins/core/config/types.ts",
  "src/plugins/core/config/validator.ts",
  "src/plugins/core/runtime-dashboard/runtime-dashboard.tsx",
  "src/plugins/core/testing/index.ts",
  "src/plugins/core/metadata/types.ts",
  "src/plugins/core/metadata/index.ts",
  "src/plugins/core/registry/state.ts",
  "src/plugins/core/registry/index.ts",
  "src/plugins/core/discovery/index.ts",
  "src/plugins/core/dependency-manager/index.ts",
  "src/plugins/core/compatibility/index.ts",
  "src/plugins/core/validator/index.ts",
  "src/plugins/core/loader/index.ts",
  "src/plugins/core/marketplace/index.ts",
  "src/plugins/core/installer/index.ts",
  "src/plugins/core/diagnostics/index.ts",
  "src/plugins/core/runtime/index.ts",
  "src/plugins/core/sdk/index.ts",
  "src/plugins/core/api/index.ts",
  "src/plugins/core/hooks/index.ts",
  "src/plugins/core/services/index.ts",
  "src/plugins/core/context/index.ts",
  "src/plugins/core/router/index.ts",
  "src/plugins/core/storage/index.ts",
  "src/plugins/core/assets/index.ts",
  "src/plugins/core/ui/index.ts",
  "src/plugins/core/sandbox/index.ts",
  "src/plugins/examples/developer-clock/metadata.ts",
  "src/plugins/examples/developer-notes/metadata.ts",
  "src/plugins/examples/system-information/metadata.ts",
  "src/plugins/examples/theme-preview/metadata.ts",
  "src/plugins/quality-diagnostics/feature-flag.ts",
  "src/plugins/quality-diagnostics/metadata.ts",
  "src/plugins/quality-diagnostics/plugin.ts",
  "src/plugins/quality-diagnostics/config.schema.ts",
  "src/plugins/quality-diagnostics/config.defaults.ts",
  "src/plugins/quality-diagnostics/validator.ts",
  "src/plugins/quality-diagnostics/routes/runtime.tsx",
  "src/plugins/quality-diagnostics/hooks/use-quality-diagnostics.ts",
  "src/plugins/quality-diagnostics/services/client-quality-diagnostics.ts",
  "src/plugins/quality-diagnostics/types/index.ts",
  "src/plugins/quality-diagnostics/ui/quality-diagnostics-panel.tsx",
  "src/plugins/quality-diagnostics/docs/README.md",
  "src/plugins/quality-diagnostics/tests/README.md",
  "docs/enhancement-plugin-architecture.md",
  "docs/plugin-platform/registry.md",
  "docs/plugin-platform/metadata.md",
  "docs/plugin-platform/dependency-manager.md",
  "docs/plugin-platform/plugin-loader.md",
  "docs/plugin-platform/marketplace.md",
  "docs/plugin-platform/installer.md",
  "docs/plugin-platform/compatibility.md",
  "docs/plugin-platform/validator.md",
  "docs/plugin-platform/diagnostics.md",
  "docs/plugin-platform/plugin-author-guide.md",
  "docs/plugin-platform/registry-api.md",
  "docs/plugin-sdk/sdk-overview.md",
  "docs/plugin-sdk/runtime.md",
  "docs/plugin-sdk/context.md",
  "docs/plugin-sdk/services.md",
  "docs/plugin-sdk/storage.md",
  "docs/plugin-sdk/routing.md",
  "docs/plugin-sdk/ui-extension.md",
  "docs/plugin-sdk/health.md",
  "docs/plugin-sdk/plugin-generator.md",
  "docs/plugin-sdk/plugin-template.md",
  "docs/plugin-sdk/best-practices.md",
  "docs/plugin-sdk/migration-guide.md",
  "scripts/plugins/create-plugin.mjs",
];

const missing = files.filter((file) => !existsSync(join(root, file)));
const registry = read("src/plugins/registry.ts");
const runtime = read("src/plugins/runtime/enhancement-runtime.tsx");
const lifecycle = read("src/plugins/core/lifecycle/manager.ts");
const flags = read("src/plugins/core/feature-flags/index.ts");
const events = read("src/plugins/core/events/index.ts");
const logger = read("src/plugins/core/logger/index.ts");
const profiler = read("src/plugins/core/profiler/index.ts");
const errorBoundary = read("src/plugins/core/error-isolation/plugin-error-boundary.tsx");
const permissions = read("src/plugins/core/permissions/index.ts");
const config = read("src/plugins/core/config/validator.ts");
const dashboard = read("src/plugins/core/runtime-dashboard/runtime-dashboard.tsx");
const metadata = read("src/plugins/core/metadata/types.ts");
const enterpriseRegistry = read("src/plugins/core/registry/index.ts");
const registryState = read("src/plugins/core/registry/state.ts");
const discovery = read("src/plugins/core/discovery/index.ts");
const dependencies = read("src/plugins/core/dependency-manager/index.ts");
const compatibility = read("src/plugins/core/compatibility/index.ts");
const validator = read("src/plugins/core/validator/index.ts");
const loader = read("src/plugins/core/loader/index.ts");
const marketplace = read("src/plugins/core/marketplace/index.ts");
const installer = read("src/plugins/core/installer/index.ts");
const diagnostics = read("src/plugins/core/diagnostics/index.ts");
const runtimeEngine = read("src/plugins/core/runtime/index.ts");
const sdk = read("src/plugins/core/sdk/index.ts");
const api = read("src/plugins/core/api/index.ts");
const hooks = read("src/plugins/core/hooks/index.ts");
const services = read("src/plugins/core/services/index.ts");
const context = read("src/plugins/core/context/index.ts");
const router = read("src/plugins/core/router/index.ts");
const storage = read("src/plugins/core/storage/index.ts");
const assets = read("src/plugins/core/assets/index.ts");
const ui = read("src/plugins/core/ui/index.ts");
const sandbox = read("src/plugins/core/sandbox/index.ts");
const generator = read("scripts/plugins/create-plugin.mjs");
const clockMetadata = read("src/plugins/examples/developer-clock/metadata.ts");
const plugin = read("src/plugins/quality-diagnostics/plugin.ts");
const qualityMetadata = read("src/plugins/quality-diagnostics/metadata.ts");
const envExample = read(".env.example");
const prodEnvExample = read(".env.production.example");
const tracker = read("docs/MASTER_IMPLEMENTATION_TRACKER.md");

const failures = [
  ...missing.map((file) => `Missing ${file}`),
  assertIncludes(registry, "PH1-QD-001", "Registry missing PH1-QD-001"),
  assertIncludes(registry, "NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS", "Registry missing quality flag env var"),
  assertIncludes(runtime, "manager.initialize", "Runtime must initialize plugins before rendering"),
  assertIncludes(runtime, "PluginErrorBoundary", "Runtime missing plugin error boundary"),
  assertIncludes(lifecycle, "initialize", "Lifecycle manager missing initialize"),
  assertIncludes(lifecycle, "suspend", "Lifecycle manager missing suspend"),
  assertIncludes(lifecycle, "healthCheck", "Lifecycle manager missing health check"),
  assertIncludes(flags, "local-storage", "Feature flags missing local storage override"),
  assertIncludes(flags, "developer", "Feature flags missing developer override"),
  assertIncludes(flags, "dependencies", "Feature flags missing dependency support"),
  assertIncludes(events, "priority", "Event bus missing priority support"),
  assertIncludes(logger, "production", "Plugin logger must be production silent"),
  assertIncludes(profiler, "exportReport", "Profiler missing report export"),
  assertIncludes(errorBoundary, "recover", "Error boundary missing recovery handoff"),
  assertIncludes(permissions, "developer", "Permission layer missing developer role"),
  assertIncludes(config, "validatePluginConfig", "Config validator missing"),
  assertIncludes(dashboard, "isPluginDashboardEnabled", "Runtime dashboard must check environment"),
  assertIncludes(metadata, "minimumPluginRuntime", "Metadata contract missing runtime compatibility"),
  assertIncludes(metadata, "signature", "Metadata contract missing signature"),
  assertIncludes(enterpriseRegistry, "register(metadata", "Enterprise registry missing register"),
  assertIncludes(enterpriseRegistry, "lookupByFlag", "Enterprise registry missing O(1) flag lookup"),
  assertIncludes(registryState, "INVALID_PLUGIN_STATE_TRANSITION", "Registry state machine missing typed transition errors"),
  assertIncludes(discovery, "src/plugins", "Discovery engine missing plugin root"),
  assertIncludes(discovery, "remoteReady", "Discovery engine missing remote-ready marker"),
  assertIncludes(dependencies, "topoSort", "Dependency manager missing topological sort"),
  assertIncludes(dependencies, "circular", "Dependency manager missing circular dependency detection"),
  assertIncludes(compatibility, "minimumPluginRuntime", "Compatibility engine missing plugin runtime validation"),
  assertIncludes(validator, "blockingIssues", "Validator missing blocking issues"),
  assertIncludes(loader, "timeout", "Loader missing timeout support"),
  assertIncludes(loader, "Abort", "Loader missing abort support"),
  assertIncludes(marketplace, "MockMarketplaceProvider", "Marketplace must use mock provider"),
  assertIncludes(installer, "rollback", "Installer missing transaction rollback"),
  assertIncludes(diagnostics, "healthScore", "Diagnostics missing health score"),
  assertIncludes(diagnostics, "heartbeat", "Diagnostics missing heartbeat support"),
  assertIncludes(runtimeEngine, "createPluginRuntimeContext", "Runtime engine missing context injection"),
  assertIncludes(runtimeEngine, "getPluginLifecycleManager", "Runtime engine must reuse lifecycle manager"),
  assertIncludes(runtimeEngine, "getEnterprisePluginRegistry", "Runtime engine must reuse registry"),
  assertIncludes(sdk, "PluginContext", "SDK missing PluginContext"),
  assertIncludes(sdk, "PluginAPI", "SDK missing PluginAPI"),
  assertIncludes(sdk, "PluginRuntime", "SDK missing PluginRuntime"),
  assertIncludes(sdk, "definePlugin", "SDK missing definePlugin"),
  assertIncludes(api, "PluginAPIRequest", "Plugin API missing typed request"),
  assertIncludes(hooks, "usePluginStorage", "SDK hooks missing storage hook"),
  assertIncludes(hooks, "usePluginHealth", "SDK hooks missing health hook"),
  assertIncludes(services, "clipboard", "Plugin services missing clipboard"),
  assertIncludes(context, "tenant", "Plugin context missing tenant"),
  assertIncludes(context, "timezone", "Plugin context missing timezone"),
  assertIncludes(router, "PluginRouteContribution", "Plugin router missing lazy route contract"),
  assertIncludes(storage, "quotaBytes", "Plugin storage missing quota support"),
  assertIncludes(storage, "migrate", "Plugin storage missing migration support"),
  assertIncludes(assets, "PluginAssetType", "Plugin assets missing asset type contract"),
  assertIncludes(ui, "floating-panels", "Plugin UI missing floating panel extension point"),
  assertIncludes(sandbox, "modify globals", "Plugin sandbox missing global mutation guard"),
  assertIncludes(generator, "metadata.ts", "Plugin generator missing metadata scaffold"),
  assertIncludes(generator, "npm run plugin:create", "Plugin generator missing command reference"),
  assertIncludes(clockMetadata, "DEVELOPER_CLOCK_WIDGET", "Developer clock sample missing feature flag"),
  assertIncludes(plugin, "healthCheck", "Quality plugin missing health check"),
  assertIncludes(qualityMetadata, "qualityDiagnosticsMetadata", "Quality plugin missing metadata"),
  assertIncludes(envExample, "NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS=false", ".env.example must disable quality diagnostics"),
  assertIncludes(envExample, "NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD=false", ".env.example must disable plugin dashboard"),
  assertIncludes(envExample, "NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER=false", ".env.example must disable plugin profiler"),
  assertIncludes(prodEnvExample, "NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS=false", ".env.production.example must disable quality diagnostics"),
  assertIncludes(prodEnvExample, "NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD=false", ".env.production.example must disable plugin dashboard"),
  assertIncludes(prodEnvExample, "NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER=false", ".env.production.example must disable plugin profiler"),
  assertIncludes(tracker, "PH1-QD-001", "Tracker missing PH1-QD-001"),
  assertIncludes(tracker, "PH1-FOUNDATION-001", "Tracker missing PH1-FOUNDATION-001"),
  assertIncludes(tracker, "PH2A-REGISTRY-001", "Tracker missing PH2A-REGISTRY-001"),
  assertIncludes(tracker, "PH2B-RUNTIME-001", "Tracker missing PH2B-RUNTIME-001"),
].filter(Boolean);

if (failures.length) {
  console.error("Enhancement registry audit failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Enhancement registry audit passed.");

function read(file) {
  return readFileSync(join(root, file), "utf8");
}

function assertIncludes(value, needle, message) {
  return value.includes(needle) ? "" : message;
}
