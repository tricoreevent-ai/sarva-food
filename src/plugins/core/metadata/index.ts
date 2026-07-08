import type { PluginMetadata, PluginMetadataValidation } from "./types";

const semanticVersion = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export function validatePluginMetadata(
  metadata: PluginMetadata,
  existing: PluginMetadata[] = [],
): PluginMetadataValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  required(metadata.id, "id", errors);
  required(metadata.name, "name", errors);
  required(metadata.displayName, "displayName", errors);
  required(metadata.version, "version", errors);
  required(metadata.featureFlag, "featureFlag", errors);
  required(metadata.entry, "entry", errors);
  required(metadata.minimumPluginRuntime, "minimumPluginRuntime", errors);

  if (metadata.version && !semanticVersion.test(metadata.version)) errors.push("Invalid semantic version.");
  if (!metadata.permissions.length) errors.push("Missing permissions.");
  if (existing.some((plugin) => plugin.id === metadata.id)) errors.push(`Duplicate plugin id: ${metadata.id}.`);
  if (existing.some((plugin) => plugin.featureFlag === metadata.featureFlag)) errors.push(`Duplicate feature flag: ${metadata.featureFlag}.`);
  if (existing.some((plugin) => plugin.name === metadata.name)) errors.push(`Duplicate plugin name: ${metadata.name}.`);
  if (!metadata.checksum) warnings.push("Checksum is not configured.");
  if (!metadata.signature) warnings.push("Signature is not configured.");

  return { passed: errors.length === 0, warnings, errors };
}

export function compareSemver(a: string, b: string) {
  const left = parseSemver(a);
  const right = parseSemver(b);
  for (let index = 0; index < 3; index += 1) {
    const diff = left[index] - right[index];
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isSemver(value: string) {
  return semanticVersion.test(value);
}

function parseSemver(value: string) {
  return value.split(/[+-]/)[0].split(".").map((part) => Number(part) || 0);
}

function required(value: unknown, field: string, errors: string[]) {
  if (value === undefined || value === null || value === "") errors.push(`Missing ${field}.`);
}
