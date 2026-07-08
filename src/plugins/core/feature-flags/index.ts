import type {
  FeatureFlagDefinition,
  FeatureFlagKey,
  FeatureFlagRead,
  FeatureFlagSnapshot,
  FeatureFlagSource,
} from "./types";

type DeveloperWindow = Window & {
  __SARVA_FEATURE_FLAGS__?: Partial<Record<FeatureFlagKey, boolean>>;
};

const localPrefix = "sarva:feature:";

const envValues: Partial<Record<FeatureFlagKey, string | undefined>> = {
  QUALITY_DIAGNOSTICS: process.env.NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS,
  PLUGIN_RUNTIME_DASHBOARD: process.env.NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD,
  PLUGIN_PROFILER: process.env.NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER,
  DEVELOPER_CLOCK_WIDGET: process.env.NEXT_PUBLIC_ENABLE_DEVELOPER_CLOCK_WIDGET,
  DEVELOPER_NOTES_WIDGET: process.env.NEXT_PUBLIC_ENABLE_DEVELOPER_NOTES_WIDGET,
  SYSTEM_INFORMATION_WIDGET: process.env.NEXT_PUBLIC_ENABLE_SYSTEM_INFORMATION_WIDGET,
  THEME_PREVIEW_WIDGET: process.env.NEXT_PUBLIC_ENABLE_THEME_PREVIEW_WIDGET,
  RESTAURANT_HEALTH_DASHBOARD: process.env.NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD,
};

const definitions: FeatureFlagDefinition[] = [
  {
    key: "QUALITY_DIAGNOSTICS",
    envVar: "NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS",
    defaultValue: false,
    description: "Optional Phase 1 quality diagnostics plugin.",
    rollbackValue: false,
    remoteReady: true,
  },
  {
    key: "PLUGIN_RUNTIME_DASHBOARD",
    envVar: "NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD",
    defaultValue: false,
    description: "Developer-only plugin runtime dashboard.",
    rollbackValue: false,
    remoteReady: true,
  },
  {
    key: "PLUGIN_PROFILER",
    envVar: "NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER",
    defaultValue: false,
    description: "Optional plugin performance profiler.",
    dependencies: ["QUALITY_DIAGNOSTICS"],
    rollbackValue: false,
    remoteReady: true,
  },
  {
    key: "DEVELOPER_CLOCK_WIDGET",
    envVar: "NEXT_PUBLIC_ENABLE_DEVELOPER_CLOCK_WIDGET",
    defaultValue: false,
    description: "Developer-only sample clock widget plugin.",
    rollbackValue: false,
    remoteReady: true,
  },
  {
    key: "DEVELOPER_NOTES_WIDGET",
    envVar: "NEXT_PUBLIC_ENABLE_DEVELOPER_NOTES_WIDGET",
    defaultValue: false,
    description: "Developer-only sample notes widget plugin.",
    rollbackValue: false,
    remoteReady: true,
  },
  {
    key: "SYSTEM_INFORMATION_WIDGET",
    envVar: "NEXT_PUBLIC_ENABLE_SYSTEM_INFORMATION_WIDGET",
    defaultValue: false,
    description: "Developer-only sample system information widget plugin.",
    rollbackValue: false,
    remoteReady: true,
  },
  {
    key: "THEME_PREVIEW_WIDGET",
    envVar: "NEXT_PUBLIC_ENABLE_THEME_PREVIEW_WIDGET",
    defaultValue: false,
    description: "Developer-only sample theme preview widget plugin.",
    rollbackValue: false,
    remoteReady: true,
  },
  {
    key: "RESTAURANT_HEALTH_DASHBOARD",
    envVar: "NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD",
    defaultValue: false,
    description: "Admin/developer Restaurant Health Dashboard validation plugin.",
    rollbackValue: false,
    remoteReady: true,
  },
];

export function readFeatureFlag(key: FeatureFlagKey): FeatureFlagRead {
  const definition = getFeatureFlagDefinition(key);
  const env = readBoolean(envValues[key]);
  const local = readLocalOverride(key);
  const developer = readDeveloperOverride(key);
  const value = developer ?? local ?? env ?? definition.defaultValue;
  const source = sourceFor({ developer, local, env });
  const errors = validateFeatureFlag(definition, value);
  const dependenciesMet = (definition.dependencies ?? []).every((dependency) => readFeatureFlag(dependency).enabled);
  const compatible = isVersionCompatible(definition.minVersion);

  return {
    key,
    enabled: value && dependenciesMet && compatible && errors.length === 0,
    source,
    dependenciesMet,
    compatible,
    rollbackValue: definition.rollbackValue ?? false,
    errors,
  };
}

export function isFeatureEnabled(key: FeatureFlagKey) {
  return readFeatureFlag(key).enabled;
}

export function isPluginDashboardEnabled() {
  return process.env.NODE_ENV !== "production" && isFeatureEnabled("PLUGIN_RUNTIME_DASHBOARD");
}

export function isPluginProfilerEnabled() {
  return isFeatureEnabled("PLUGIN_PROFILER");
}

export function getFeatureFlagSnapshot(): FeatureFlagSnapshot {
  return {
    flags: definitions.map((definition) => readFeatureFlag(definition.key)),
    generatedAt: Date.now(),
  };
}

export function getFeatureFlagDefinitions() {
  return definitions;
}

export function setLocalFeatureOverride(key: FeatureFlagKey, enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${localPrefix}${key}`, enabled ? "true" : "false");
}

export function clearLocalFeatureOverride(key: FeatureFlagKey) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${localPrefix}${key}`);
}

export function rollbackFeatureFlag(key: FeatureFlagKey) {
  const definition = getFeatureFlagDefinition(key);
  setLocalFeatureOverride(key, definition.rollbackValue ?? false);
}

function getFeatureFlagDefinition(key: FeatureFlagKey) {
  const definition = definitions.find((item) => item.key === key);
  if (!definition) throw new Error(`Unknown feature flag: ${key}`);
  return definition;
}

function readBoolean(value: string | undefined) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function readLocalOverride(key: FeatureFlagKey) {
  if (typeof window === "undefined") return undefined;
  return readBoolean(window.localStorage.getItem(`${localPrefix}${key}`) ?? undefined);
}

function readDeveloperOverride(key: FeatureFlagKey) {
  if (typeof window === "undefined") return undefined;
  return (window as DeveloperWindow).__SARVA_FEATURE_FLAGS__?.[key];
}

function sourceFor({
  developer,
  local,
  env,
}: {
  developer?: boolean;
  local?: boolean;
  env?: boolean;
}): FeatureFlagSource {
  if (developer !== undefined) return "developer";
  if (local !== undefined) return "local-storage";
  if (env !== undefined) return "environment";
  return "default";
}

function validateFeatureFlag(definition: FeatureFlagDefinition, enabled: boolean) {
  const errors: string[] = [];
  if (enabled && definition.key === "PLUGIN_RUNTIME_DASHBOARD" && process.env.NODE_ENV === "production") {
    errors.push("Runtime dashboard cannot run in production.");
  }
  return errors;
}

function isVersionCompatible(minVersion?: string) {
  if (!minVersion) return true;
  const current = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
  return current.localeCompare(minVersion, undefined, { numeric: true }) >= 0;
}
