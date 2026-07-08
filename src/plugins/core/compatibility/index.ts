import { isFeatureEnabled } from "../feature-flags";
import { compareSemver } from "../metadata";
import type { PluginMetadata, PluginPlatform, SupportedModule } from "../metadata/types";

export type CompatibilityContext = {
  appVersion: string;
  pluginRuntimeVersion: string;
  platform: PluginPlatform;
  environment: "development" | "staging" | "production";
  browser?: string;
  module?: SupportedModule;
};

export type CompatibilityReport = {
  passed: boolean;
  warnings: string[];
  errors: string[];
};

export function validatePluginCompatibility(
  metadata: PluginMetadata,
  context: CompatibilityContext,
): CompatibilityReport {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (metadata.minimumAppVersion && compareSemver(stripVersion(context.appVersion), stripVersion(metadata.minimumAppVersion)) < 0) {
    errors.push(`App version ${context.appVersion} is below ${metadata.minimumAppVersion}.`);
  }
  if (metadata.maximumAppVersion && compareSemver(stripVersion(context.appVersion), stripVersion(metadata.maximumAppVersion)) > 0) {
    errors.push(`App version ${context.appVersion} is above ${metadata.maximumAppVersion}.`);
  }
  if (compareSemver(context.pluginRuntimeVersion, metadata.minimumPluginRuntime) < 0) {
    errors.push(`Plugin runtime ${context.pluginRuntimeVersion} is below ${metadata.minimumPluginRuntime}.`);
  }
  if (!metadata.compatiblePlatforms.includes(context.platform)) errors.push(`Unsupported platform: ${context.platform}.`);
  if (context.module && !metadata.supportedModules.includes(context.module)) warnings.push(`Module ${context.module} is not listed as supported.`);
  if (!isFeatureEnabled(metadata.featureFlag)) warnings.push(`Feature flag ${metadata.featureFlag} is disabled.`);

  return { passed: errors.length === 0, warnings, errors };
}

function stripVersion(value: string) {
  return value.replace(/^v/, "").replace(/-rc\./, "-");
}
