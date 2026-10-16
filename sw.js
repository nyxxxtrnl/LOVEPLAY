const CACHE_NAME = "loveplay-shell-v9";
const APP_FILES = [
  "index.html",
  "manifest.webmanifest",
  "DASHBOARD/index.html",
  "DASHBOARD/script.js",
  "DASHBOARD/style.css",
  "DASHBOARD/messenger.js",
  "DASHBOARD/messenger.css",
  "DASHBOARD/firebase-config.js",
  "ASSETS/loveplay-icon.svg",
  "ASSETS/avatar-default.svg",
  "ASSETS/roblox-logo.svg",
  "ASSETS/mlbb-logo.svg",
  ...Array.from({ length: 21 }, (_, index) => `ASSETS/memory-${index + 1}.jpg`)
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const appRoot = self.registration.scope;
    await cache.addAll(APP_FILES.map(file => new URL(file, appRoot).href));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter(cacheName => cacheName.startsWith("loveplay-shell-") && cacheName !== CACHE_NAME)
      .map(cacheName => caches.delete(cacheName)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const appRoot = self.registration.scope;
        const dashboard = await cache.match(new URL("DASHBOARD/index.html", appRoot).href);
        if (dashboard) return dashboard;
      }
      throw error;
    }
  })());
});
