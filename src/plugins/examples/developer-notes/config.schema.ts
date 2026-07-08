export type DeveloperNotesConfig = {
  enabled: boolean;
  storageKey: string;
};

export const developerNotesConfigSchema = {
  fields: {
    enabled: "boolean",
    storageKey: "string",
  },
} as const;
