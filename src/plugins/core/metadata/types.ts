import type { FeatureFlagKey } from "../feature-flags/types";
import type { PluginRole } from "../permissions";

export type PluginCategory =
  | "analytics"
  | "crm"
  | "ai"
  | "reports"
  | "operations"
  | "quality"
  | "enterprise"
  | "integration"
  | "developer";

export type PluginPlatform = "web" | "server" | "worker";
export type SupportedModule = "customer" | "owner" | "admin" | "pos" | "kitchen" | "waiter" | "developer";
export type PluginOperationalStatus = "available" | "installed" | "validated" | "enabled" | "disabled" | "broken" | "quarantined";

export type PluginDependency = {
  id: string;
  version?: string;
  optional?: boolean;
  soft?: boolean;
  development?: boolean;
};

export type PluginMetadata = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  author: string;
  company: string;
  website?: string;
  email?: string;
  version: string;
  license: string;
  category: PluginCategory;
  priority: "P0" | "P1" | "P2" | "P3";
  dependencies: PluginDependency[];
  peerDependencies: PluginDependency[];
  optionalDependencies: PluginDependency[];
  softDependencies: PluginDependency[];
  developmentDependencies: PluginDependency[];
  permissions: PluginRole[];
  featureFlag: FeatureFlagKey;
  minimumAppVersion?: string;
  maximumAppVersion?: string;
  minimumPluginRuntime: string;
  compatiblePlatforms: PluginPlatform[];
  supportedModules: SupportedModule[];
  entry: string;
  icon?: string;
  logo?: string;
  screenshots: string[];
  documentation: string;
  homepage?: string;
  repository?: string;
  issues?: string;
  releaseNotes?: string;
  keywords: string[];
  tags: string[];
  bundleSize: number;
  checksum?: string;
  signature?: string;
  installSize: number;
  health: "unknown" | "healthy" | "degraded" | "failed";
  status: PluginOperationalStatus;
};

export type PluginMetadataValidation = {
  passed: boolean;
  warnings: string[];
  errors: string[];
};
