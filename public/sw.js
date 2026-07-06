const CACHE_VERSION = "sarva-v14-20260706-fcm-static-only";
const CACHE_PREFIX = "sarva-";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const STATIC_URLS = [
  "/offline",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(STATIC_URLS.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SARVA_SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "SARVA_GET_CACHE_STATE") {
    event.waitUntil(sendCacheState(event.source));
  }
  if (event.data?.type === "SARVA_CLEAR_CACHES") {
    event.waitUntil(clearSarvaCaches().then(() => notifyClients("SARVA_CACHES_CLEARED")));
  }
  if (event.data?.type === "SARVA_UNREGISTER_SW") {
    event.waitUntil(
      clearSarvaCaches()
        .then(() => self.registration.unregister())
        .then(() => notifyClients("SARVA_SW_UNREGISTERED")),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      event.respondWith(networkOnlyWithOptionalQueue(request));
    }
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/") || isNextRouterDataRequest(request, url)) {
    return;
  }

  if (isCustomerCatalogRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkOnlyNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json") {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sarva-sync-queue") {
    event.waitUntil(notifyClients("SARVA_SYNC_QUEUE"));
  }
});

self.addEventListener("push", (event) => {
  const notification = notificationFromPush(event.data);
  if (!notification) return;
  event.waitUntil(
    Promise.all([
      setBadge(notification.badgeCount),
      self.registration.showNotification(notification.title, notification.options),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = safeClientLink(event.notification.data?.link || "/");
  event.waitUntil(openOrFocusClient(link));
});

self.addEventListener("notificationclose", (event) => {
  event.waitUntil(notifyClients("SARVA_PUSH_CLOSED", { notificationId: event.notification.data?.notificationId }));
});

async function networkOnlyNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match("/offline")) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (canCache(response)) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkOnlyWithOptionalQueue(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const url = new URL(request.url);
    if (
      url.origin === self.location.origin &&
      !url.pathname.startsWith("/api/auth/") &&
      !url.pathname.startsWith("/api/public/")
    ) {
      await notifyClients("SARVA_SYNC_QUEUE");
    }
    throw error;
  }
}

function canCache(response) {
  if (!response || !response.ok || (response.type !== "basic" && response.type !== "default")) {
    return false;
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/x-component")) {
    return false;
  }
  return true;
}

function isCustomerCatalogRequest(url) {
  return (
    url.pathname.startsWith("/api/public/") ||
    url.pathname.startsWith("/restaurant/") ||
    url.pathname === "/restaurants" ||
    url.pathname === "/offers"
  );
}

function isNextRouterDataRequest(request, url) {
  return (
    url.searchParams.has("_rsc") ||
    request.headers.get("rsc") === "1" ||
    request.headers.has("next-router-state-tree") ||
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-url")
  );
}

async function notifyClients(type, payload = {}) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  clients.forEach((client) => client.postMessage({ type, version: CACHE_VERSION, ...payload }));
}

async function clearSarvaCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key)));
}

async function sendCacheState(source) {
  if (!source) return;
  const keys = await caches.keys();
  source.postMessage({
    type: "SARVA_CACHE_STATE",
    version: CACHE_VERSION,
    caches: keys.filter((key) => key.startsWith(CACHE_PREFIX)),
  });
}

function notificationFromPush(data) {
  const payload = parsePushData(data);
  if (!payload) return null;
  const rawNotification = payload.notification || payload.webpush?.notification || {};
  const rawData = payload.data || rawNotification.data || {};
  const title = String(rawNotification.title || rawData.title || "Nammude");
  const body = String(rawNotification.body || rawData.body || rawData.message || "");
  const link = safeClientLink(
    rawData.link ||
    payload.fcmOptions?.link ||
    payload.webpush?.fcm_options?.link ||
    payload.webpush?.fcmOptions?.link ||
    "/",
  );
  const badgeCount = Math.max(1, Math.min(99, Number(rawData.badge || 1)));
  return {
    title,
    badgeCount,
    options: {
      body,
      icon: rawNotification.icon || "/android-chrome-192x192.png",
      badge: rawNotification.badge || "/icons/nammude-icon-96.png",
      tag: rawNotification.tag || rawData.notificationId || rawData.orderId || "sarva-notification",
      renotify: rawData.priority === "high",
      requireInteraction: rawData.priority === "high",
      silent: false,
      data: {
        ...rawData,
        link,
        notificationId: rawData.notificationId,
      },
    },
  };
}

function parsePushData(data) {
  if (!data) return null;
  try {
    return data.json();
  } catch {
    try {
      return JSON.parse(data.text());
    } catch {
      return null;
    }
  }
}

function safeClientLink(value) {
  try {
    const url = new URL(String(value || "/"), self.location.origin);
    return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

async function openOrFocusClient(path) {
  const target = new URL(path, self.location.origin).href;
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  const focused = clients.find((client) => client.url === target || new URL(client.url).pathname === path);
  if (focused) {
    focused.postMessage({ type: "SARVA_PUSH_CLICK", link: path, version: CACHE_VERSION });
    return focused.focus();
  }
  return self.clients.openWindow(target);
}

async function setBadge(count) {
  if (typeof self.registration.setAppBadge !== "function") return;
  await self.registration.setAppBadge(count).catch(() => undefined);
}
