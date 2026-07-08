import type { PluginConfigSchema, PluginConfigValidation } from "./types";

export function validatePluginConfig<TConfig extends object>(
  schema: PluginConfigSchema<TConfig>,
  defaults: TConfig,
  input: Partial<TConfig> = {},
): PluginConfigValidation<TConfig> {
  const config = { ...defaults, ...input };
  const errors: string[] = [];

  for (const key of Object.keys(schema.fields) as Array<keyof TConfig>) {
    const rule = schema.fields[key];
    const value = config[key];

    if (rule.required && (value === undefined || value === null || value === "")) {
      errors.push(`${String(key)} is required.`);
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rule.type === "number" && typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) errors.push(`${String(key)} is below ${rule.min}.`);
      if (rule.max !== undefined && value > rule.max) errors.push(`${String(key)} is above ${rule.max}.`);
      continue;
    }

    if (typeof value !== rule.type) {
      errors.push(`${String(key)} must be ${rule.type}.`);
    }
  }

  return { config, errors };
}

export function migratePluginConfig<TConfig extends object>(
  defaults: TConfig,
  input?: Partial<TConfig>,
) {
  return { ...defaults, ...input };
}
