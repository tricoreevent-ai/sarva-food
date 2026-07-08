export type FeatureFlagKey =
  | "QUALITY_DIAGNOSTICS"
  | "PLUGIN_RUNTIME_DASHBOARD"
  | "PLUGIN_PROFILER"
  | "DEVELOPER_CLOCK_WIDGET"
  | "DEVELOPER_NOTES_WIDGET"
  | "SYSTEM_INFORMATION_WIDGET"
  | "THEME_PREVIEW_WIDGET";

export type FeatureFlagSource =
  | "default"
  | "environment"
  | "local-storage"
  | "developer"
  | "remote";

export type FeatureFlagDefinition = {
  key: FeatureFlagKey;
  envVar: string;
  defaultValue: boolean;
  description: string;
  dependencies?: FeatureFlagKey[];
  minVersion?: string;
  rollbackValue?: boolean;
  remoteReady: boolean;
};

export type FeatureFlagRead = {
  key: FeatureFlagKey;
  enabled: boolean;
  source: FeatureFlagSource;
  dependenciesMet: boolean;
  compatible: boolean;
  rollbackValue: boolean;
  errors: string[];
};

export type FeatureFlagSnapshot = {
  flags: FeatureFlagRead[];
  generatedAt: number;
};
