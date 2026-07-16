"use client";

import type { MessagePayload, Unsubscribe } from "firebase/messaging";
import { isFirebaseConfigured } from "@/firebase/config";

export type PushSurface = "customer" | "owner" | "admin" | "kitchen" | "pos" | "waiter";

export type PushRegistrationState = {
  status: "enabled" | "denied" | "default" | "unsupported" | "missing-key" | "failed";
  tokenHash?: string;
  deviceCount?: number;
};

const TOKEN_KEY = "sarva-fcm-token";
const REGISTERED_AT_KEY = "sarva-fcm-registered-at";
const TOKEN_HASH_KEY = "sarva-fcm-token-hash";
const DEVICE_COUNT_KEY = "sarva-fcm-device-count";
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export async function registerCurrentPushToken(surface: PushSurface): Promise<PushRegistrationState> {
  if (!hasPushSupport()) return { status: "unsupported" };
  if (!VAPID_KEY) return { status: "missing-key" };
  if (Notification.permission !== "granted") return { status: Notification.permission };

  try {
    const messaging = await resolveMessaging();
    if (!messaging) return { status: "unsupported" };
    const registration = await navigator.serviceWorker.ready;
    const { getToken } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return { status: "failed" };

    const payload = await savePushToken(token, surface);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REGISTERED_AT_KEY, String(Date.now()));
    if (payload.tokenHash) localStorage.setItem(TOKEN_HASH_KEY, payload.tokenHash);
    localStorage.setItem(DEVICE_COUNT_KEY, String(payload.deviceCount ?? 1));
    return {
      status: "enabled",
      tokenHash: payload.tokenHash,
      deviceCount: payload.deviceCount,
    };
  } catch {
    return { status: "failed" };
  }
}

export async function requestPushPermission(surface: PushSurface) {
  if (!hasPushSupport()) return { status: "unsupported" } satisfies PushRegistrationState;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    await removeRegisteredPushToken(surface, false);
    return { status: permission } satisfies PushRegistrationState;
  }
  return registerCurrentPushToken(surface);
}

export async function refreshPushTokenIfNeeded(surface: PushSurface, maxAgeMs = 12 * 60 * 60 * 1000) {
  if (!hasPushSupport() || Notification.permission !== "granted") return;
  const registeredAt = Number(localStorage.getItem(REGISTERED_AT_KEY) ?? 0);
  if (Date.now() - registeredAt < maxAgeMs && localStorage.getItem(TOKEN_KEY)) return;
  await registerCurrentPushToken(surface);
}

export async function forceRefreshPushToken(surface: PushSurface) {
  localStorage.removeItem(REGISTERED_AT_KEY);
  return registerCurrentPushToken(surface);
}

export async function removeRegisteredPushToken(surface: PushSurface, deleteFirebaseToken = true) {
  const token = localStorage.getItem(TOKEN_KEY) ?? "";
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REGISTERED_AT_KEY);
  localStorage.removeItem(TOKEN_HASH_KEY);
  localStorage.removeItem(DEVICE_COUNT_KEY);

  await fetch("/api/user/preferences", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "removePushToken", pushToken: token, surface }),
    keepalive: true,
  }).catch(() => undefined);

  if (!deleteFirebaseToken) return;
  const messaging = await resolveMessaging().catch(() => null);
  if (!messaging) return;
  const { deleteToken } = await import("firebase/messaging");
  await deleteToken(messaging).catch(() => undefined);
}

export async function listenForForegroundPush(callback: (payload: MessagePayload) => void): Promise<Unsubscribe> {
  const messaging = await resolveMessaging();
  if (!messaging) return () => undefined;
  const { onMessage } = await import("firebase/messaging");
  return onMessage(messaging, callback);
}

export function normalizePushPayload(payload: MessagePayload) {
  const data = payload.data ?? {};
  return {
    title: payload.notification?.title || data.title || "Nammude",
    body: payload.notification?.body || data.body || data.message || "",
    link: safeLink(data.link),
    tone: data.priority === "high" ? "critical" as const : data.type === "payment" ? "success" as const : "info" as const,
    sound: data.sound || "bell",
    badge: Number(data.badge || 1),
  };
}

export function getPushDeviceDiagnostics() {
  const supported = hasPushSupport();
  const token = typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) ?? "";
  const registeredAt = typeof window === "undefined" ? 0 : Number(localStorage.getItem(REGISTERED_AT_KEY) ?? 0);
  return {
    supported,
    permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
    serviceWorker: typeof navigator !== "undefined" && navigator.serviceWorker?.controller ? "active" : "not-controlled",
    firebaseRegistration: token ? "registered" : "not-registered",
    vapidConfigured: Boolean(VAPID_KEY),
    token,
    tokenHash: typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_HASH_KEY) ?? "",
    deviceCount: typeof window === "undefined" ? 0 : Number(localStorage.getItem(DEVICE_COUNT_KEY) ?? 0),
    registeredAt: registeredAt ? new Date(registeredAt).toISOString() : "",
  };
}

export function dispatchForegroundPushTest() {
  window.dispatchEvent(new CustomEvent("sarva:push-test", {
    detail: {
      title: "Foreground notification test",
      body: "Foreground toast, badge, sound, and deep-link handling are available.",
      link: "/owner/settings?tab=notifications",
      tone: "info" as const,
      sound: "bell",
      badge: 1,
    },
  }));
}

export async function dispatchBackgroundPushTest(withActions = false) {
  if (!("serviceWorker" in navigator)) throw new Error("Service workers are not supported.");
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active || registration.waiting || registration.installing;
  if (!worker) throw new Error("Service worker is not active.");
  worker.postMessage({
    type: "SARVA_TEST_NOTIFICATION",
    payload: {
      title: withActions ? "Notification action test" : "Background notification test",
      body: withActions ? "Use Open Settings or Dismiss." : "Background display and badge handling are available.",
      link: "/owner/settings?tab=notifications",
      notificationId: `local-test-${Date.now()}`,
      actions: withActions ? [{ action: "open", title: "Open Settings" }, { action: "dismiss", title: "Dismiss" }] : [],
    },
  });
}

export function hasPushSupport() {
  return typeof window !== "undefined"
    && isFirebaseConfigured
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

async function resolveMessaging() {
  if (!hasPushSupport()) return null;
  const [{ getFirebaseApp }, { getMessaging, isSupported }] = await Promise.all([
    import("@/firebase/client"),
    import("firebase/messaging"),
  ]);
  const supported = await isSupported().catch(() => false);
  return supported ? getMessaging(getFirebaseApp()) : null;
}

async function savePushToken(token: string, surface: PushSurface) {
  const response = await fetch("/api/user/preferences", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "registerPushToken",
      pushToken: token,
      surface,
      permission: Notification.permission,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    }),
  });
  const data = await response.json().catch(() => ({})) as { tokenHash?: string; deviceCount?: number; error?: string };
  if (!response.ok) throw new Error(data.error ?? "Push token save failed.");
  return data;
}

function safeLink(value?: string) {
  if (!value) return "/";
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}
