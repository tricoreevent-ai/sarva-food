const CACHE_VERSION = "sarva-v8-20260526";
const CACHE_PREFIX = "sarva-";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const MENU_CACHE = `${CACHE_VERSION}-menus`;
const REPORT_CACHE = `${CACHE_VERSION}-reports`;
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
      event.waitUntil(notifyClients("SARVA_SYNC_QUEUE"));
    }
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/api/public/")) {
    event.respondWith(staleWhileRevalidate(request, MENU_CACHE));
    return;
  }

  if (url.pathname.startsWith("/restaurant/")) {
    event.respondWith(staleWhileRevalidate(request, MENU_CACHE));
    return;
  }

  if (url.pathname.startsWith("/owner/reports") || url.pathname.startsWith("/owner/inventory")) {
    event.respondWith(staleWhileRevalidate(request, REPORT_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json") {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sarva-sync-queue") {
    event.waitUntil(notifyClients("SARVA_SYNC_QUEUE"));
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (canCache(response)) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("/offline"));
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

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (canCache(response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fresh;
}

function canCache(response) {
  return response && response.ok && (response.type === "basic" || response.type === "default");
}

async function notifyClients(type) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  clients.forEach((client) => client.postMessage({ type, version: CACHE_VERSION }));
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
