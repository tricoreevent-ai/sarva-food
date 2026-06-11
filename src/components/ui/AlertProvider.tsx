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
let originalToastMethods: { success: typeof toast.success; error: typeof toast.error } | null = null;
let warnedToastBridge = false;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AlertRequest[]>([]);
  const activeRequest = queue[0] ?? null;

  const enqueue = useCallback((request: Omit<AlertRequest, "id">) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setQueue((current) => [...current, { ...request, id }]);
  }, []);

  const api = useMemo<AlertApi>(() => ({
    alert: (message, options = {}) => new Promise<void>((resolve) => enqueue({
      kind: "alert",
      message,
      options,
      resolve: () => resolve(),
    })),
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
    initializeToastAlertBridge(api);
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
    console.warn("[Nammude] Native alert/confirm/prompt are overridden by the animated AlertProvider. Use window.sarvaNativeAlerts.useNative() to temporarily restore native dialogs.");
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

function initializeToastAlertBridge(api: AlertApi) {
  if (typeof window === "undefined") return;
  const target = toast as typeof toast & { success: typeof toast.success; error: typeof toast.error };
  originalToastMethods ??= {
    success: target.success.bind(toast),
    error: target.error.bind(toast),
  };

  if (process.env.NODE_ENV !== "production" && !warnedToastBridge) {
    warnedToastBridge = true;
    console.warn("[Nammude] Mobile toast success/error messages are routed through AlertProvider.");
  }

  target.success = ((message: Parameters<typeof toast.success>[0], options?: Parameters<typeof toast.success>[1]) => {
    if (!shouldUseAlertToast(message)) return originalToastMethods!.success(message, options);
    void api.alert(String(message), {
      title: "Success",
      okText: "Done",
      tone: "success",
      confetti: true,
      closeOnBackdrop: true,
    });
    return `alert-success-${Date.now()}`;
  }) as typeof toast.success;

  target.error = ((message: Parameters<typeof toast.error>[0], options?: Parameters<typeof toast.error>[1]) => {
    if (!shouldUseAlertToast(message)) return originalToastMethods!.error(message, options);
    void api.alert(String(message), {
      title: "Please check",
      okText: "OK",
      tone: "danger",
      closeOnBackdrop: true,
    });
    return `alert-error-${Date.now()}`;
  }) as typeof toast.error;
}

function shouldUseAlertToast(message: unknown) {
  return typeof window !== "undefined" && (typeof message === "string" || typeof message === "number");
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

function restoreNativeMethods() {
  if (typeof window === "undefined" || !originalNativeMethods) return;
  window.alert = originalNativeMethods.alert;
  window.confirm = originalNativeMethods.confirm;
  window.prompt = originalNativeMethods.prompt;
}

export type { AlertOptions, PromptOptions };
