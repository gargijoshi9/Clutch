const CACHE_NAME = "clutch-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/src/main.tsx",
  "/src/index.css",
  "/src/App.tsx",
  "/manifest.json"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn("Asset caching skipped during SW install:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (e) => {
  // Only intercept HTTP/S requests
  if (!e.request.url.startsWith("http")) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Return network response
        return networkResponse;
      }).catch(() => {
        // Offline fallback can go here if needed
      });
    })
  );
});
