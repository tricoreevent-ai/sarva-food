export type PluginConfigFieldType = "boolean" | "number" | "string";

export type PluginConfigField = {
  type: PluginConfigFieldType;
  required?: boolean;
  min?: number;
  max?: number;
};

export type PluginConfigSchema<TConfig extends object> = {
  version: number;
  fields: Record<keyof TConfig, PluginConfigField>;
};

export type PluginConfigValidation<TConfig extends object> = {
  config: TConfig;
  errors: string[];
};
