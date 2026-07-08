import type { PluginStorageMode, PluginUI } from "@/plugins/core/sdk";

export type RestaurantHealthStatus = "healthy" | "degraded" | "failed";
export type RestaurantHealthExtensionPoint = PluginUI["point"];

export type RestaurantHealthSignal = {
  id: string;
  label: string;
  status: RestaurantHealthStatus;
  value: string;
};

export type RestaurantHealthStorageAudit = {
  mode: PluginStorageMode;
  keys: number;
  bytes: number;
  quotaBytes: number;
  migrationVersion: number;
  quotaBlocked: boolean;
};

export type RestaurantHealthSnapshot = {
  pluginId: string;
  version: string;
  generatedAt: number;
  status: RestaurantHealthStatus;
  healthScore: number;
  role: string;
  environment: string;
  language: string;
  timezone: string;
  theme: string;
  extensionPoints: number;
  routes: number;
  navigation: number;
  assets: number;
  storage: RestaurantHealthStorageAudit[];
  signals: RestaurantHealthSignal[];
};

export type RestaurantHealthRuntimeAudit = {
  install: boolean;
  register: boolean;
  validate: boolean;
  initialize: boolean;
  enable: boolean;
  run: boolean;
  suspend: boolean;
  resume: boolean;
  disable: boolean;
  destroy: boolean;
  reload: boolean;
  uninstall: boolean;
};

export type RestaurantHealthPermissionAudit = Record<
  "guest" | "customer" | "kitchen" | "waiter" | "owner" | "admin" | "developer",
  {
    visible: boolean;
    navigation: boolean;
    routing: boolean;
    actions: boolean;
  }
>;
