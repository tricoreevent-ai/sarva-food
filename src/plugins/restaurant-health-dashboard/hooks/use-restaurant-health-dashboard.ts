"use client";

import { useMemo } from "react";
import {
  usePlugin,
  usePluginConfig,
  usePluginDiagnostics,
  usePluginEvents,
  usePluginHealth,
  usePluginLifecycle,
  usePluginLogger,
  usePluginPermission,
  usePluginRuntime,
  usePluginStorage,
} from "@/plugins/core/sdk/hooks";
import type { RestaurantHealthDashboardConfig } from "../config.defaults";
import { restaurantHealthDashboardMetadata } from "../metadata";

export function useRestaurantHealthDashboardPlugin() {
  const pluginId = restaurantHealthDashboardMetadata.id;
  const plugin = usePlugin(pluginId);
  const config = usePluginConfig<RestaurantHealthDashboardConfig>(pluginId);
  const diagnostics = usePluginDiagnostics(pluginId);
  const events = usePluginEvents();
  const health = usePluginHealth(pluginId);
  const lifecycle = usePluginLifecycle();
  const logger = usePluginLogger(pluginId);
  const permissions = usePluginPermission(pluginId);
  const runtime = usePluginRuntime();
  const storage = usePluginStorage(pluginId);

  return useMemo(() => ({
    plugin,
    config,
    diagnostics,
    events,
    health,
    lifecycle,
    logger,
    permissions,
    runtime,
    storage,
  }), [plugin, config, diagnostics, events, health, lifecycle, logger, permissions, runtime, storage]);
}
