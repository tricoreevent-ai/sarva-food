import { getPluginLifecycleManager } from "../lifecycle/manager";
import { getPluginMarketplace } from "../marketplace";
import { getEnterprisePluginRegistry } from "../registry";

export type PluginHealthMonitorSnapshot = {
  pluginId: string;
  heartbeats: number;
  runtimeErrors: number;
  memoryBytes: number;
  fps: number;
  longTasks: number;
  leaks: number;
  failures: number;
  healthScore: number;
  disabled: boolean;
  updatedAt: number;
};

class PluginHealthMonitor {
  private snapshots = new Map<string, PluginHealthMonitorSnapshot>();

  heartbeat(pluginId: string) {
    const snapshot = this.ensure(pluginId);
    snapshot.heartbeats += 1;
    snapshot.updatedAt = Date.now();
  }

  recordError(pluginId: string) {
    const snapshot = this.ensure(pluginId);
    snapshot.runtimeErrors += 1;
    snapshot.failures += 1;
    snapshot.healthScore = Math.max(0, snapshot.healthScore - 20);
    snapshot.updatedAt = Date.now();
    if (snapshot.failures >= 3) snapshot.disabled = true;
  }

  recordPerformance(pluginId: string, metric: "memoryBytes" | "fps" | "longTasks" | "leaks", value: number) {
    const snapshot = this.ensure(pluginId);
    snapshot[metric] = value;
    snapshot.healthScore = score(snapshot);
    snapshot.updatedAt = Date.now();
  }

  snapshot(pluginId: string) {
    return this.snapshots.get(pluginId);
  }

  list() {
    return Array.from(this.snapshots.values());
  }

  clear(pluginId?: string) {
    if (pluginId) {
      this.snapshots.delete(pluginId);
      return;
    }
    this.snapshots.clear();
  }

  private ensure(pluginId: string) {
    const existing = this.snapshots.get(pluginId);
    if (existing) return existing;
    const snapshot: PluginHealthMonitorSnapshot = {
      pluginId,
      heartbeats: 0,
      runtimeErrors: 0,
      memoryBytes: 0,
      fps: 60,
      longTasks: 0,
      leaks: 0,
      failures: 0,
      healthScore: 100,
      disabled: false,
      updatedAt: Date.now(),
    };
    this.snapshots.set(pluginId, snapshot);
    return snapshot;
  }
}

const pluginHealthMonitor = new PluginHealthMonitor();

export function getPluginHealthMonitor() {
  return pluginHealthMonitor;
}

export function getPluginDiagnostics() {
  const records = getEnterprisePluginRegistry().list();
  const lifecycle = getPluginLifecycleManager().getSnapshot();
  const installed = getPluginMarketplace().installed();
  const failures = lifecycle.filter((plugin) => plugin.health.status === "failed");
  const loadTimes = lifecycle.map((plugin) => plugin.loadTimeMs);
  const avg = loadTimes.length ? Math.round(loadTimes.reduce((sum, value) => sum + value, 0) / loadTimes.length) : 0;
  const bundleSize = records.reduce((sum, record) => sum + record.metadata.bundleSize, 0);
  const installSize = records.reduce((sum, record) => sum + record.metadata.installSize, 0);

  return {
    installedPlugins: installed.length,
    registeredPlugins: records.length,
    enabledPlugins: records.filter((record) => record.state === "ENABLED" || record.state === "RUNNING").length,
    disabledPlugins: records.filter((record) => record.state === "DISABLED").length,
    brokenPlugins: failures.length,
    memory: typeof performance !== "undefined" && "memory" in performance ? "available" : "unavailable",
    loadTime: loadTimes.reduce((sum, value) => sum + value, 0),
    initializationTime: avg,
    validationFailures: records.filter((record) => record.state === "REGISTERED").length,
    dependencyFailures: 0,
    runtimeFailures: failures.length,
    healthScore: records.length ? Math.max(0, 100 - failures.length * 25) : 100,
    monitoredPlugins: pluginHealthMonitor.list().length,
    automaticDisables: pluginHealthMonitor.list().filter((plugin) => plugin.disabled).length,
    averageStartup: avg,
    bundleSize,
    installSize,
  };
}

function score(snapshot: PluginHealthMonitorSnapshot) {
  return Math.max(0, 100 - snapshot.runtimeErrors * 20 - snapshot.longTasks * 5 - snapshot.leaks * 15);
}
