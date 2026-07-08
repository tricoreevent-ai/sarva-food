import { validatePluginCompatibility, type CompatibilityContext } from "../compatibility";
import { resolvePluginDependencies } from "../dependency-manager";
import { validatePluginMetadata } from "../metadata";
import type { PluginMetadata } from "../metadata/types";

export type PluginValidationReport = {
  pluginId: string;
  passed: boolean;
  warnings: string[];
  errors: string[];
  blockingIssues: string[];
  recoverySuggestions: string[];
};

export function validatePluginPipeline(
  metadata: PluginMetadata,
  installed: PluginMetadata[],
  context: CompatibilityContext,
): PluginValidationReport {
  const metadataReport = validatePluginMetadata(metadata, installed.filter((plugin) => plugin.id !== metadata.id));
  const dependencyReport = resolvePluginDependencies([metadata, ...installed]);
  const compatibilityReport = validatePluginCompatibility(metadata, context);
  const warnings = [...metadataReport.warnings, ...compatibilityReport.warnings];
  const errors = [
    ...metadataReport.errors,
    ...dependencyReport.issues.map((issue) => `${issue.pluginId}:${issue.dependencyId}:${issue.message}`),
    ...compatibilityReport.errors,
  ];
  const blockingIssues = errors.filter(Boolean);

  return {
    pluginId: metadata.id,
    passed: blockingIssues.length === 0,
    warnings,
    errors,
    blockingIssues,
    recoverySuggestions: suggestionsFor(blockingIssues),
  };
}

function suggestionsFor(issues: string[]) {
  if (!issues.length) return [];
  return issues.map((issue) => {
    if (issue.includes("dependency")) return "Install or enable the required dependency before enabling this plugin.";
    if (issue.includes("version")) return "Install a compatible plugin or application version.";
    if (issue.includes("feature")) return "Check feature flag ownership and disable duplicate flags.";
    return "Review plugin metadata and retry validation.";
  });
}
