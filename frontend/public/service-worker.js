// AgroNav service worker — offline-first shell + stale-while-revalidate for API.
// Reps on 2G see cached data immediately; fresh data loads in background.
const CACHE_NAME = "agronav-cache-v2";
// Separate cache for API responses so we can version them independently
const API_CACHE  = "agronav-api-v1";
const API_URLS   = ["/recommendations", "/api/manager/kpis", "/api/alerts", "/outcomes"];

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/manifest.json",
  "/logo192.png",
  "/logo512.png"
];

// Install: Cache core assets and activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching shell assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate: Clean up old caches (keep API_CACHE) and claim clients immediately
self.addEventListener("activate", (event) => {
  const KEEP = [CACHE_NAME, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (!KEEP.includes(cache)) {
            console.log("[SW] Deleting old cache:", cache);
            return caches.delete(cache);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // ── TASK 3: Stale-while-revalidate for AgroNav API responses ──────────────
  // Covers both localhost:8000 (dev) and the deployed backend.
  const isApiHost = url.port === "8000" ||
                    url.hostname.includes("agronav") ||
                    url.hostname.includes("run.app");  // Cloud Run
  const isApiPath = API_URLS.some((u) => url.pathname.includes(u));

  if (isApiHost && isApiPath) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached       = await cache.match(event.request);
        // Always kick off a background network fetch to keep cache fresh
        const networkFetch = fetch(event.request)
          .then((res) => {
            if (res.status === 200) cache.put(event.request, res.clone());
            return res;
          })
          .catch(() => cached || new Response(null, { status: 503 }));
        // Return cached immediately if available (stale-while-revalidate)
        // otherwise wait for network
        return cached || networkFetch;
      })
    );
    return;
  }

  // ── Navigation: network-first, fall back to index.html ────────────────────
  if (event.request.mode === "navigate" ||
      url.pathname === "/" ||
      url.pathname === "/index.html") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        })
        .catch(() => caches.match("/index.html") || caches.match("/"))
    );
    return;
  }

  // ── Static assets: cache-first with background revalidation ────────────────
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, networkResponse)
            );
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          !event.request.url.startsWith("http")
        ) {
          return networkResponse;
        }
        caches.open(CACHE_NAME).then((cache) =>
          cache.put(event.request, networkResponse.clone())
        );
        return networkResponse;
      });
    })
  );
});

// ── TASK 8: Background Sync — flush queued visit logs when back online ───────
self.addEventListener("sync", (event) => {
  if (event.tag === "flush-visit-logs") {
    event.waitUntil(flushLogsFromSW());
  }
});

async function flushLogsFromSW() {
  const cache = await caches.open("agronav-queue-v1");
  const keys  = await cache.keys();
  for (const req of keys) {
    if (req.url.includes("queued-visit-")) {
      const body = await cache.match(req).then((r) => r.json()).catch(() => null);
      if (!body) continue;
      try {
        const token = await getTokenFromClients();
        await fetch("/visit_log", {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        await cache.delete(req);
        console.log("[SW] Flushed queued visit log");
      } catch {
        /* leave in queue — will retry next sync */
      }
    }
  }
}

// Read the JWT from any attached client's localStorage via postMessage.
// Falls back to null gracefully so the sync still runs (unauthenticated
// requests are rejected by the backend, not by the service worker).
function getTokenFromClients() {
  return self.clients.matchAll().then((clients) => {
    if (!clients.length) return null;
    return new Promise((resolve) => {
      const mc = new MessageChannel();
      mc.port1.onmessage = (e) => resolve(e.data?.token || null);
      clients[0].postMessage({ type: "GET_TOKEN" }, [mc.port2]);
      setTimeout(() => resolve(null), 500);
    });
  });
}
