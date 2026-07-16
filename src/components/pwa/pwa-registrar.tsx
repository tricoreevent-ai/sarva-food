"use client";

import { useEffect } from "react";

const EXPECTED_SW_VERSION = "sarva-v15-20260716-push-diagnostics";

export function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const allowLocalHttpsTesting =
      process.env.NODE_ENV !== "production" &&
      window.location.protocol === "https:" &&
      (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        /^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(window.location.hostname)
      );

    if (process.env.NODE_ENV !== "production" && !allowLocalHttpsTesting) {
      void navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);
      if ("caches" in window) {
        void caches.keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith("sarva-")).map((key) => caches.delete(key))))
          .catch(() => undefined);
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
        void registration.update().catch(() => undefined);
        registration.waiting?.postMessage({ type: "SARVA_SKIP_WAITING" });
        registration.addEventListener("updatefound", () => {
          registration.installing?.addEventListener("statechange", () => {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SARVA_SKIP_WAITING" });
            }
          });
        });
      }).catch(() => {
        // PWA registration is progressive enhancement; browser ordering still works.
      });
    };

    const handleControllerChange = () => {
      navigator.serviceWorker.controller?.postMessage({ type: "SARVA_GET_CACHE_STATE" });
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SARVA_CACHE_STATE" && event.data.version !== EXPECTED_SW_VERSION) {
        navigator.serviceWorker.controller?.postMessage({ type: "SARVA_UNREGISTER_SW" });
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    navigator.serviceWorker.addEventListener("message", handleMessage);

    if (document.readyState === "complete") {
      register();
      return () => {
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      };
    }

    window.addEventListener("load", register, { once: true });
    return () => {
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
