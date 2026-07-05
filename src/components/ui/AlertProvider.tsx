"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { AlertModal } from "@/components/ui/AlertModal";
import { AlertContext } from "@/hooks/useAlert";
import type { AlertApi, AlertOptions, AlertRequest, NativeAlertOverrideController, PromptOptions } from "@/types/alert.types";

declare global {
  interface Window {
    sarvaNativeAlerts?: NativeAlertOverrideController;
  }
}

type NativeMethods = {
  alert: Window["alert"];
  confirm: Window["confirm"];
  prompt: Window["prompt"];
};

let originalNativeMethods: NativeMethods | null = null;
let customNativeEnabled = true;
let warnedNativeOverride = false;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AlertRequest[]>([]);
  const activeRequest = queue[0] ?? null;

  const enqueue = useCallback((request: Omit<AlertRequest, "id">) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setQueue((current) => [...current, { ...request, id }]);
  }, []);

  const api = useMemo<AlertApi>(() => ({
    alert: (message, options = {}) => {
      showAlertToast(message, options);
      return Promise.resolve();
    },
    confirm: (message, options = {}) => new Promise<boolean>((resolve) => enqueue({
      kind: "confirm",
      message,
      options,
      resolve: (value) => resolve(Boolean(value)),
    })),
    prompt: (message, defaultValueOrOptions = "", options = {}) => new Promise<string | null>((resolve) => {
      const optionObject = typeof defaultValueOrOptions === "string" ? options : defaultValueOrOptions;
      const defaultValue = typeof defaultValueOrOptions === "string" ? defaultValueOrOptions : defaultValueOrOptions.defaultValue ?? "";
      enqueue({
        kind: "prompt",
        message,
        defaultValue,
        placeholder: optionObject.placeholder,
        inputLabel: optionObject.inputLabel,
        options: optionObject,
        resolve: (value) => resolve(typeof value === "string" ? value : null),
      });
    }),
  }), [enqueue]);

  useEffect(() => {
    initializeNativeAlertOverrides(api);
    return () => undefined;
  }, [api]);

  useEffect(() => {
    if (!queue.length) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [queue.length]);

  function resolveRequest(request: AlertRequest, value: unknown) {
    request.resolve(value);
    setQueue((current) => current.filter((item) => item.id !== request.id));
  }

  return (
    <AlertContext.Provider value={api}>
      {children}
      <AlertModal request={activeRequest} stackCount={queue.length} onResolve={resolveRequest} />
    </AlertContext.Provider>
  );
}

export function initializeNativeAlertOverrides(api: AlertApi) {
  if (typeof window === "undefined") return;
  if (!originalNativeMethods) {
    originalNativeMethods = {
      alert: window.alert.bind(window),
      confirm: window.confirm.bind(window),
      prompt: window.prompt.bind(window),
    };
  }

  if (process.env.NODE_ENV !== "production" && !warnedNativeOverride) {
    warnedNativeOverride = true;
    console.warn("[Nammude] Native alert uses toast notifications; confirm/prompt use the custom AlertProvider.");
  }

  const controller: NativeAlertOverrideController = {
    enable: () => {
      customNativeEnabled = true;
      applyNativeOverrides(api);
    },
    disable: () => {
      customNativeEnabled = false;
      restoreNativeMethods();
    },
    useNative: () => {
      customNativeEnabled = false;
      restoreNativeMethods();
    },
    useCustom: () => {
      customNativeEnabled = true;
      applyNativeOverrides(api);
    },
    isCustomEnabled: () => customNativeEnabled,
    restore: restoreNativeMethods,
  };
  window.sarvaNativeAlerts = controller;
  if (customNativeEnabled) applyNativeOverrides(api);
}

function applyNativeOverrides(api: AlertApi) {
  if (typeof window === "undefined") return;
  const target = window as unknown as {
    alert: (message?: unknown) => Promise<void>;
    confirm: (message?: unknown) => Promise<boolean>;
    prompt: (message?: unknown, defaultValue?: string) => Promise<string | null>;
  };
  target.alert = (message?: unknown) => api.alert(String(message ?? ""), { title: "Notice" });
  target.confirm = (message?: unknown) => api.confirm(String(message ?? ""), { title: "Confirm action" });
  target.prompt = (message?: unknown, defaultValue?: string) => api.prompt(String(message ?? ""), defaultValue ?? "");
}

function showAlertToast(message: ReactNode, options: AlertOptions) {
  const content = (message ?? "") as Parameters<typeof toast>[0];
  if (options.tone === "success") {
    toast.success(content);
    return;
  }
  if (options.tone === "danger") {
    toast.error(content);
    return;
  }
  toast(content, { icon: options.tone === "warning" ? "!" : undefined, className: options.tone === "warning" ? "sarva-toast sarva-toast-warning" : undefined });
}

function restoreNativeMethods() {
  if (typeof window === "undefined" || !originalNativeMethods) return;
  window.alert = originalNativeMethods.alert;
  window.confirm = originalNativeMethods.confirm;
  window.prompt = originalNativeMethods.prompt;
}

export type { AlertOptions, PromptOptions };
