export type DeveloperClockConfig = {
  enabled: boolean;
  displayFormat: "iso" | "local";
};

export const developerClockConfigSchema = {
  fields: {
    enabled: "boolean",
    displayFormat: "enum:iso,local",
  },
} as const;
