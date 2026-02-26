// Minimal service worker required for PWA installability
// No caching - just satisfies the browser's install criteria

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-only strategy - no caching
  event.respondWith(fetch(event.request));
});
