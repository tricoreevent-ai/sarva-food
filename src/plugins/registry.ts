import { isFeatureEnabled, isPluginDashboardEnabled } from "@/plugins/core/feature-flags";
import type { FeatureFlagKey } from "@/plugins/core/feature-flags/types";
import type { PluginRole } from "@/plugins/core/permissions";

export type EnhancementFlag = "QUALITY_DIAGNOSTICS";

export type EnhancementStatus = "disabled" | "enabled";

export type EnhancementManifest = {
  id: string;
  name: string;
  phase: "phase-1" | "phase-2" | "phase-3" | "phase-4" | "phase-5";
  priority: "P0" | "P1" | "P2";
  owner: string;
  flag: EnhancementFlag;
  permissions: PluginRole[];
  envVar: string;
  status: EnhancementStatus;
  databaseImpact: "none" | "new-optional" | "new-collection";
  apiImpact: "none" | "new-endpoint";
  performanceImpact: string;
  bundleImpact: string;
  realtimeImpact: "none" | "bounded";
  memoryImpact: string;
  riskLevel: "low" | "medium" | "high";
};

export const enhancementRegistry = [
  {
    id: "PH1-QD-001",
    name: "Quality Diagnostics",
    phase: "phase-1",
    priority: "P1",
    owner: "Codex",
    flag: "QUALITY_DIAGNOSTICS",
    permissions: ["developer"],
    envVar: "NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS",
    status: isFeatureEnabled("QUALITY_DIAGNOSTICS") ? "enabled" : "disabled",
    databaseImpact: "none",
    apiImpact: "none",
    performanceImpact: "Idle client-only sampling when explicitly enabled.",
    bundleImpact: "Lazy plugin chunk only when at least one enhancement flag is enabled.",
    realtimeImpact: "none",
    memoryImpact: "Bounded observers and interval cleanup on unmount.",
    riskLevel: "low",
  },
] satisfies EnhancementManifest[];

export function isEnhancementEnabled(flag: EnhancementFlag) {
  return isFeatureEnabled(flag);
}

export function hasEnabledEnhancements() {
  return enhancementRegistry.some((plugin) => isEnhancementEnabled(plugin.flag));
}

export function shouldMountEnhancementRuntime() {
  return hasEnabledEnhancements() || isPluginDashboardEnabled();
}

export function isEnhancementFlag(flag: FeatureFlagKey): flag is EnhancementFlag {
  return flag === "QUALITY_DIAGNOSTICS";
}
