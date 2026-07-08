import { definePlugin } from "@/plugins/core/sdk";
import { developerNotesMetadata } from "./metadata";

export default definePlugin({
  metadata: developerNotesMetadata,
  activate(context) {
    context.storage.set("note", "SDK storage ready");
    context.ui.register({
      id: `${context.pluginId}:widget`,
      pluginId: context.pluginId,
      point: "widgets",
      label: "Notes",
      flag: context.featureFlag,
      permissions: context.permissions,
      load: async () => ({ note: context.storage.get("note") }),
    });
  },
  healthCheck: () => ({ status: "healthy" }),
});
