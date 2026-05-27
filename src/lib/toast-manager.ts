"use client";

import toast, { type ToastOptions } from "react-hot-toast";

type ToastKind = "success" | "error" | "loading" | "blank";
type ToastConfig = {
  title: string;
  kind?: ToastKind;
  duration?: number;
  options?: ToastOptions;
};

const shownToastIds = new Map<string, number>();
const DEFAULT_DEDUPE_WINDOW_MS = 2_500;

export const toastManager = {
  showOnce(id: string, config: ToastConfig) {
    const now = Date.now();
    const previous = shownToastIds.get(id);
    if (previous && now - previous < DEFAULT_DEDUPE_WINDOW_MS) return;
    shownToastIds.set(id, now);

    const options: ToastOptions = {
      id,
      duration: config.duration,
      ...(config.options ?? {}),
    };

    if (config.kind === "success") {
      toast.success(config.title, options);
      return;
    }
    if (config.kind === "error") {
      toast.error(config.title, options);
      return;
    }
    if (config.kind === "loading") {
      toast.loading(config.title, options);
      return;
    }
    toast(config.title, options);
  },
  successOnce(id: string, title: string, options?: ToastOptions) {
    this.showOnce(id, { title, kind: "success", options });
  },
  errorOnce(id: string, title: string, options?: ToastOptions) {
    this.showOnce(id, { title, kind: "error", options });
  },
  clear(id?: string) {
    if (id) {
      shownToastIds.delete(id);
      toast.dismiss(id);
      return;
    }
    shownToastIds.clear();
    toast.dismiss();
  },
};

