import { compareSemver } from "../metadata";
import type { PluginDependency, PluginMetadata } from "../metadata/types";

export type DependencyIssue = {
  pluginId: string;
  dependencyId: string;
  type: "missing" | "version" | "circular" | "disabled";
  message: string;
};

export type DependencyResolution = {
  passed: boolean;
  tree: Record<string, string[]>;
  graph: Record<string, string[]>;
  executionOrder: string[];
  issues: DependencyIssue[];
};

const cache = new Map<string, DependencyResolution>();

export function resolvePluginDependencies(plugins: PluginMetadata[], disabledIds = new Set<string>()): DependencyResolution {
  const key = JSON.stringify({ plugins: plugins.map((plugin) => [plugin.id, plugin.version]), disabled: [...disabledIds].sort() });
  const cached = cache.get(key);
  if (cached) return cached;

  const byId = new Map(plugins.map((plugin) => [plugin.id, plugin]));
  const graph: Record<string, string[]> = {};
  const issues: DependencyIssue[] = [];

  for (const plugin of plugins) {
    const deps = allRuntimeDependencies(plugin);
    graph[plugin.id] = deps.map((dependency) => dependency.id);
    for (const dependency of deps) {
      const target = byId.get(dependency.id);
      if (!target && !dependency.optional && !dependency.soft) {
        issues.push(issue(plugin.id, dependency.id, "missing", "Missing dependency."));
      }
      if (target && dependency.version && compareSemver(target.version, dependency.version) < 0) {
        issues.push(issue(plugin.id, dependency.id, "version", `Requires ${dependency.version}, found ${target.version}.`));
      }
      if (disabledIds.has(dependency.id) && !dependency.optional && !dependency.soft) {
        issues.push(issue(plugin.id, dependency.id, "disabled", "Dependency is disabled."));
      }
    }
  }

  const executionOrder = topoSort(graph, issues);
  const result = {
    passed: issues.length === 0,
    tree: graph,
    graph,
    executionOrder,
    issues,
  };
  cache.set(key, result);
  return result;
}

export function clearDependencyResolutionCache() {
  cache.clear();
}

function allRuntimeDependencies(plugin: PluginMetadata): PluginDependency[] {
  return [
    ...plugin.dependencies,
    ...plugin.peerDependencies,
    ...plugin.optionalDependencies,
    ...plugin.softDependencies,
  ];
}

function topoSort(graph: Record<string, string[]>, issues: DependencyIssue[]) {
  const seen = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];

  const visit = (id: string, path: string[]) => {
    if (visiting.has(id)) {
      issues.push(issue(id, id, "circular", `Circular dependency: ${[...path, id].join(" -> ")}.`));
      return;
    }
    if (seen.has(id)) return;
    visiting.add(id);
    for (const dependency of graph[id] ?? []) {
      if (graph[dependency]) visit(dependency, [...path, id]);
    }
    visiting.delete(id);
    seen.add(id);
    order.push(id);
  };

  Object.keys(graph).forEach((id) => visit(id, []));
  return order;
}

function issue(pluginId: string, dependencyId: string, type: DependencyIssue["type"], message: string): DependencyIssue {
  return { pluginId, dependencyId, type, message };
}
