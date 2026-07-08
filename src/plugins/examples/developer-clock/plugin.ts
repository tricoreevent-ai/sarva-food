import { definePlugin } from "@/plugins/core/sdk";
import { developerClockMetadata } from "./metadata";

export default definePlugin({
  metadata: developerClockMetadata,
  activate(context) {
    context.ui.register({
      id: `${context.pluginId}:widget`,
      pluginId: context.pluginId,
      point: "widgets",
      label: "Clock",
      flag: context.featureFlag,
      permissions: context.permissions,
      load: async () => ({ now: new Date().toISOString() }),
    });
  },
  healthCheck: () => ({ status: "healthy" }),
});
