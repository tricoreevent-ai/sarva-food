import { definePlugin } from "@/plugins/core/sdk";
import { systemInformationMetadata } from "./metadata";

export default definePlugin({
  metadata: systemInformationMetadata,
  activate(context) {
    context.diagnostics.heartbeat();
    context.ui.register({
      id: `${context.pluginId}:widget`,
      pluginId: context.pluginId,
      point: "widgets",
      label: "System",
      flag: context.featureFlag,
      permissions: context.permissions,
      load: async () => ({ runtimeVersion: context.runtimeVersion, environment: context.environment }),
    });
  },
  healthCheck: () => ({ status: "healthy" }),
});
