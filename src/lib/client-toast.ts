"use client";

type ToastApi = typeof import("react-hot-toast")["default"];
type SarvaNotificationInput = Parameters<
  typeof import("@/components/ui/app-toaster")["showSarvaNotification"]
>[0];

let toastApiPromise: Promise<ToastApi> | undefined;

function loadToast() {
  toastApiPromise ??= import("react-hot-toast").then((module) => module.default);
  return toastApiPromise;
}

function showToast(...args: Parameters<ToastApi>) {
  void loadToast().then((api) => api(...args));
}

export const toast = Object.assign(showToast, {
  success(...args: Parameters<ToastApi["success"]>) {
    void loadToast().then((api) => api.success(...args));
  },
  error(...args: Parameters<ToastApi["error"]>) {
    void loadToast().then((api) => api.error(...args));
  },
  dismiss(...args: Parameters<ToastApi["dismiss"]>) {
    void loadToast().then((api) => api.dismiss(...args));
  },
  promise<T>(
    promise: Promise<T>,
    messages: Parameters<ToastApi["promise"]>[1],
    options?: Parameters<ToastApi["promise"]>[2],
  ) {
    void loadToast().then((api) => api.promise(promise, messages, options));
    return promise;
  },
});

export function showLazySarvaNotification(input: SarvaNotificationInput) {
  void import("@/components/ui/app-toaster").then(({ showSarvaNotification }) => {
    showSarvaNotification(input);
  });
}
