import type { PluginContext } from "../context";

export type PluginSandboxSnapshot = {
  pluginId: string;
  globalsAdded: string[];
  destroyed: boolean;
};

export type PluginSandbox<TConfig extends object = Record<string, unknown>> = {
  run: <T>(action: (context: PluginContext<TConfig>) => T | Promise<T>) => Promise<T>;
  snapshot: () => PluginSandboxSnapshot;
  destroy: () => void;
};

export function createPluginSandbox<TConfig extends object>(context: PluginContext<TConfig>): PluginSandbox<TConfig> {
  const baselineGlobals = new Set(Object.getOwnPropertyNames(globalThis));
  let destroyed = false;
  let globalsAdded: string[] = [];
  const safeContext = deepFreeze(context);

  return {
    async run(action) {
      if (destroyed) throw new Error(`Plugin sandbox is destroyed: ${context.pluginId}.`);
      const value = await action(safeContext);
      globalsAdded = Object.getOwnPropertyNames(globalThis).filter((name) => !baselineGlobals.has(name));
      if (globalsAdded.length) throw new Error(`Plugin attempted to modify globals: ${globalsAdded.join(", ")}.`);
      return value;
    },
    snapshot: () => ({ pluginId: context.pluginId, globalsAdded: [...globalsAdded], destroyed }),
    destroy: () => {
      destroyed = true;
      globalsAdded = [];
    },
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  Object.freeze(value);
  for (const item of Object.values(value)) {
    if (item && typeof item === "object" && !Object.isFrozen(item)) deepFreeze(item);
  }
  return value;
}
