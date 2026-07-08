import { getPluginLifecycleManager } from "../lifecycle/manager";
import type { PluginDefinition } from "../lifecycle/types";
import { getEnterprisePluginRegistry } from "../registry";
import { validatePluginPipeline } from "../validator";
import type { CompatibilityContext } from "../compatibility";
import type { PluginMetadata } from "../metadata/types";

export type InstallTransaction = {
  plugin: PluginMetadata;
  definition: PluginDefinition;
  installed: PluginMetadata[];
  context: CompatibilityContext;
};

export async function installPluginTransaction(input: InstallTransaction) {
  const registry = getEnterprisePluginRegistry();
  const lifecycle = getPluginLifecycleManager();
  const completed: Array<() => Promise<void> | void> = [];

  try {
    const report = validatePluginPipeline(input.plugin, input.installed, input.context);
    if (!report.passed) throw new Error(report.blockingIssues.join(" "));

    registry.register(input.plugin);
    completed.push(() => registry.unregister(input.plugin.id));
    registry.markValidated(input.plugin.id);

    lifecycle.register(input.definition);
    await lifecycle.initialize(input.definition.id);
    registry.markInitialized(input.plugin.id);
    await lifecycle.enable(input.definition.id);
    registry.enable(input.plugin.id);
    await lifecycle.healthCheck(input.definition.id);
    registry.run(input.plugin.id);

    return { passed: true, report };
  } catch (error) {
    for (const rollback of completed.reverse()) await rollback();
    return {
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
