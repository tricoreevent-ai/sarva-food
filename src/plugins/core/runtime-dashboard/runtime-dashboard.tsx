"use client";

import { useEffect, useState } from "react";
import { getFeatureFlagSnapshot, isPluginDashboardEnabled } from "../feature-flags";
import type { FeatureFlagSnapshot } from "../feature-flags/types";
import { getPluginLifecycleManager } from "../lifecycle/manager";
import type { PluginSnapshot } from "../lifecycle/types";
import { getPluginProfiler, type PluginProfilerReport } from "../profiler";

export function PluginRuntimeDashboard() {
  const [plugins, setPlugins] = useState<PluginSnapshot[]>([]);
  const [flags, setFlags] = useState<FeatureFlagSnapshot>(() => getFeatureFlagSnapshot());
  const [report, setReport] = useState<PluginProfilerReport>(() => getPluginProfiler().exportReport());

  useEffect(() => {
    if (!isPluginDashboardEnabled()) return;
    const read = () => {
      setPlugins(getPluginLifecycleManager().getSnapshot());
      setFlags(getFeatureFlagSnapshot());
      setReport(getPluginProfiler().exportReport());
    };
    read();
    const id = window.setInterval(read, 1500);
    return () => window.clearInterval(id);
  }, []);

  if (!isPluginDashboardEnabled()) return null;

  return (
    <aside className="fixed left-3 top-20 z-[70] max-h-[70vh] w-[320px] overflow-auto rounded-md border bg-background/95 p-3 text-xs text-foreground shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong>Plugin Runtime</strong>
        <span>{report.fps} FPS</span>
      </div>
      <div className="space-y-2">
        {plugins.length ? plugins.map((plugin) => (
          <section key={plugin.id} className="rounded border p-2">
            <div className="flex justify-between gap-2">
              <span>{plugin.name}</span>
              <span>{plugin.state}</span>
            </div>
            <div className="mt-1 text-muted-foreground">
              {plugin.health.status} / {plugin.loadTimeMs}ms / errors {plugin.errors.length}
            </div>
          </section>
        )) : <p className="text-muted-foreground">No plugin loaded.</p>}
      </div>
      <div className="mt-3 border-t pt-2">
        <strong>Flags</strong>
        {flags.flags.map((flag) => (
          <div key={flag.key} className="mt-1 flex justify-between gap-2">
            <span>{flag.key}</span>
            <span>{flag.enabled ? "on" : "off"}:{flag.source}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t pt-2">
        <strong>Profiler</strong>
        <div className="mt-1 flex justify-between gap-2">
          <span>long tasks</span>
          <span>{report.longTasks.length}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <span>memory</span>
          <span>{report.memory ? `${report.memory.usedHeapMb}MB` : "n/a"}</span>
        </div>
      </div>
    </aside>
  );
}
