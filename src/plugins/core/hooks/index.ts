"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getPluginEventBus } from "../events";
import { getPluginLifecycleManager } from "../lifecycle/manager";
import { createPluginLogger } from "../logger";
import { getPluginRuntimeManager } from "../runtime";
import { getPluginStorageManager } from "../storage";

export function usePlugin(pluginId: string) {
  const runtime = getPluginRuntimeManager();
  const executions = useSyncExternalStore(runtime.subscribe.bind(runtime), () => runtime.list(), () => []);
  return executions.find((execution) => execution.metadata.id === pluginId);
}

export function usePluginConfig<TConfig extends object>(pluginId: string) {
  return usePlugin(pluginId)?.context.config as TConfig | undefined;
}

export function usePluginPermission(pluginId: string) {
  return usePlugin(pluginId)?.context.permissions ?? [];
}

export function usePluginStorage(pluginId: string) {
  return useMemo(() => getPluginStorageManager().namespace(pluginId, { mode: "memory" }), [pluginId]);
}

export function usePluginLogger(pluginId: string) {
  return useMemo(() => createPluginLogger(pluginId), [pluginId]);
}

export function usePluginEvents() {
  return getPluginEventBus();
}

export function usePluginRuntime() {
  return getPluginRuntimeManager();
}

export function usePluginDiagnostics(pluginId: string) {
  return usePlugin(pluginId)?.context.diagnostics;
}

export function usePluginHealth(pluginId: string) {
  const lifecycle = getPluginLifecycleManager().getSnapshot();
  return lifecycle.find((plugin) => plugin.id === pluginId)?.health;
}

export function usePluginLifecycle() {
  return getPluginLifecycleManager();
}
