export type ThemePreviewConfig = {
  enabled: boolean;
  includeAssets: boolean;
};

export const themePreviewConfigSchema = {
  fields: {
    enabled: "boolean",
    includeAssets: "boolean",
  },
} as const;
