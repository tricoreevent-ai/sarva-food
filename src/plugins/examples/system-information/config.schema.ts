export type SystemInformationConfig = {
  enabled: boolean;
  includeRuntimeVersion: boolean;
};

export const systemInformationConfigSchema = {
  fields: {
    enabled: "boolean",
    includeRuntimeVersion: "boolean",
  },
} as const;
