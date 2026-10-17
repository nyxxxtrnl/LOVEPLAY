const CACHE_NAME = "loveplay-shell-v30";
const APP_FILES = [
  "index.html",
  "manifest.webmanifest",
  "DASHBOARD/index.html",
  "DASHBOARD/script.js",
  "DASHBOARD/style.css",
  "DASHBOARD/messenger.js",
  "DASHBOARD/messenger.css",
  "DASHBOARD/firebase-config.js",
  "ASSETS/loveplay-app-icon.png",
  "ASSETS/loveplay-app-icon-192.png",
  "ASSETS/loveplay-app-icon-180.png",
  "ASSETS/avatar-default.svg",
  "ASSETS/roblox-logo.svg",
  "ASSETS/mlbb-logo.svg",
  "ASSETS/game-icons/roblox.png",
  "ASSETS/game-icons/chess.png",
  "ASSETS/game-icons/mlbb.png",
  "ASSETS/game-icons/clash.png",
  "ASSETS/game-icons/tongits.png",
  "ASSETS/game-icons/genshin.png",
  "ASSETS/game-icons/cod.png",
  "ASSETS/game-icons/pubg.png",
  "ASSETS/game-icons/freefire.png",
  "ASSETS/game-icons/brawl.png",
  "ASSETS/game-icons/minecraft.png",
  "ASSETS/game-icons/fortnite.jpg",
  "ASSETS/game-icons/amongus.png",
  "ASSETS/game-icons/terraria.png",
  "ASSETS/game-icons/stumble.png",
  "ASSETS/game-icons/8ball.png",
  "ASSETS/game-icons/heartopia.png",
  "ASSETS/game-icons/coffee.png",
  "ASSETS/game-icons/subway.png",
  "ASSETS/game-icons/4pics1word.png",
  "ASSETS/game-icons/cookingmama.png",
  "ASSETS/game-icons/candycrush.png",
  "ASSETS/game-icons/pokemongo.png",
  "ASSETS/game-icons/pvz2.png",
  "ASSETS/game-icons/gardenscapes.png",
  "ASSETS/game-icons/royalmatch.png",
  "ASSETS/game-icons/hayday.png",
  "ASSETS/game-icons/templerun2.png",
  "ASSETS/game-icons/tocaboca.png",
  "ASSETS/game-icons/asphalt.png",
  ...Array.from({ length: 21 }, (_, index) => `ASSETS/memory-${index + 1}.jpg`)
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const appRoot = self.registration.scope;
    await Promise.all(APP_FILES.map(async file => {
      const url = new URL(file, appRoot).href;
      const response = await fetch(new Request(url, { cache: "reload" }));
      if (!response.ok) throw new Error(`Could not cache ${file} (${response.status}).`);
      await cache.put(url, response);
    }));
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
      const response = await fetch(new Request(request, { cache: "reload" }));
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
