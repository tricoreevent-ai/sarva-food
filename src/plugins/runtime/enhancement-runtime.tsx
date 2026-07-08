"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { isPluginDashboardEnabled, isPluginProfilerEnabled } from "@/plugins/core/feature-flags";
import { PluginErrorBoundary } from "@/plugins/core/error-isolation/plugin-error-boundary";
import { getPluginLifecycleManager } from "@/plugins/core/lifecycle/manager";
import { canAccessPlugin, getRuntimePluginRole } from "@/plugins/core/permissions";
import { getPluginProfiler } from "@/plugins/core/profiler";
import { isEnhancementEnabled } from "@/plugins/registry";

function EmptyEnhancementRuntime() {
  return null;
}

const LazyQualityDiagnosticsRuntime = dynamic(
  () =>
    import("@/plugins/quality-diagnostics/routes/runtime").then(
      (module) => module.QualityDiagnosticsRuntime,
    ),
  { ssr: false },
);
const LazyPluginRuntimeDashboard = isPluginDashboardEnabled()
  ? dynamic(
      () =>
        import("@/plugins/core/runtime-dashboard/runtime-dashboard").then(
          (module) => module.PluginRuntimeDashboard,
        ),
      { ssr: false },
    )
  : EmptyEnhancementRuntime;

export function EnhancementRuntime() {
  const [qualityReady, setQualityReady] = useState(false);

  useEffect(() => {
    let active = true;
    const profiler = getPluginProfiler();
    if (isPluginProfilerEnabled()) profiler.start();

    async function startQualityDiagnostics() {
      if (!isEnhancementEnabled("QUALITY_DIAGNOSTICS")) return;
      const startedAt = performance.now();
      const { qualityDiagnosticsPlugin } = await import("@/plugins/quality-diagnostics/plugin");
      if (!canAccessPlugin(qualityDiagnosticsPlugin.permissions, getRuntimePluginRole())) return;
      const manager = getPluginLifecycleManager();
      manager.register(qualityDiagnosticsPlugin);
      await manager.initialize(qualityDiagnosticsPlugin.id);
      await manager.enable(qualityDiagnosticsPlugin.id);
      profiler.recordPluginLoad(qualityDiagnosticsPlugin.id, performance.now() - startedAt);
      if (active) setQualityReady(true);
    }

    void startQualityDiagnostics();

    return () => {
      active = false;
      setQualityReady(false);
      void getPluginLifecycleManager().destroy("PH1-QD-001").catch(() => undefined);
      profiler.stop();
    };
  }, []);

  return (
    <>
      {qualityReady ? (
        <PluginErrorBoundary pluginId="PH1-QD-001">
          <LazyQualityDiagnosticsRuntime />
        </PluginErrorBoundary>
      ) : null}
      <LazyPluginRuntimeDashboard />
    </>
  );
}
