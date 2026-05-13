// What it does: Workbox service worker for offline PWA support
// Input: Browser service worker lifecycle events
// Output: Cached responses for offline use
// Called by: Browser after registration in index.html

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
  console.log('[SW] Workbox loaded');

  // Cache core pages with CacheFirst
  workbox.routing.registerRoute(
    ({url}) => url.pathname === '/' || url.pathname === '/dashboard' || url.pathname === '/alerts' || url.pathname === '/outcomes',
    new workbox.strategies.CacheFirst({
      cacheName: 'pages-cache',
    })
  );

  // Cache Bootstrap CSS CDN
  workbox.routing.registerRoute(
    ({url}) => url.href.includes('cdn.jsdelivr.net/npm/bootstrap'),
    new workbox.strategies.CacheFirst({
      cacheName: 'cdn-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({ maxEntries: 10 }),
      ],
    })
  );

  // Cache Vue CDN
  workbox.routing.registerRoute(
    ({url}) => url.href.includes('unpkg.com/vue'),
    new workbox.strategies.CacheFirst({
      cacheName: 'cdn-cache',
    })
  );

  // Visit pages → NetworkFirst (try network, fall back to cache)
  workbox.routing.registerRoute(
    ({url}) => url.pathname.startsWith('/visit'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'visit-cache',
    })
  );

  // API calls → NetworkFirst
  workbox.routing.registerRoute(
    ({url}) => url.pathname.startsWith('/api/') && url.pathname !== '/api/visits/log',
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
    })
  );

  // POST /api/visits/log → queue offline with BackgroundSync
  const bgSync = new workbox.backgroundSync.BackgroundSyncPlugin('outcome-queue', {
    maxRetentionTime: 24 * 60, // 24 hours
  });

  workbox.routing.registerRoute(
    ({url}) => url.pathname === '/api/visits/log',
    new workbox.strategies.NetworkOnly({
      plugins: [bgSync],
    }),
    'POST'
  );

  // Cache static assets
  workbox.routing.registerRoute(
    ({url}) => url.pathname.startsWith('/static/') || url.pathname.startsWith('/src/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'static-cache',
    })
  );

} else {
  console.log('[SW] Workbox failed to load');
}
