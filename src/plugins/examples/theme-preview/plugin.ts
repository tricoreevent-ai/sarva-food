import { definePlugin } from "@/plugins/core/sdk";
import { themePreviewMetadata } from "./metadata";

export default definePlugin({
  metadata: themePreviewMetadata,
  activate(context) {
    context.assets.register({
      id: `${context.pluginId}:manifest`,
      pluginId: context.pluginId,
      type: "manifest",
      version: context.version,
      href: context.pluginId,
    });
    context.ui.register({
      id: `${context.pluginId}:widget`,
      pluginId: context.pluginId,
      point: "widgets",
      label: "Theme",
      flag: context.featureFlag,
      permissions: context.permissions,
      load: async () => ({ theme: context.theme }),
    });
  },
  healthCheck: () => ({ status: "healthy" }),
});
