const CACHE_VERSION = "xpert-v1";
const CACHE_NAME = `${CACHE_VERSION}-cache`;

// Assets to cache on install
const PRECACHE_ASSETS = [
  "/",
];

// Install event - precache essential assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Precaching assets");
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first strategy for images, network-first for everything else
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache strategy for images from x.ai CDN
  if (
    request.destination === "image" ||
    url.hostname.includes("x.ai") ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("[Service Worker] Serving from cache:", url.pathname);
            return cachedResponse;
          }

          return fetch(request).then((response) => {
            // Only cache successful responses
            if (response.status === 200) {
              console.log("[Service Worker] Caching image:", url.pathname);
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Cache strategy for API routes - cache-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("[Service Worker] Serving API from cache:", url.pathname);
            return cachedResponse;
          }

          return fetch(request).then((response) => {
            // Cache successful API responses
            if (response.status === 200 && request.method === "GET") {
              console.log("[Service Worker] Caching API response:", url.pathname);
              cache.put(request, response.clone());
            }
            return response;
          }).catch((error) => {
            console.error("[Service Worker] Fetch failed:", error);
            // Return cached response if available, even if stale
            return cache.match(request);
          });
        });
      })
    );
    return;
  }

  // Network-first strategy for everything else
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(request);
      })
  );
});

// Message event - for cache management
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log("[Service Worker] Cache cleared");
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === "GET_CACHE_SIZE") {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const keys = await cache.keys();
        let totalSize = 0;

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }

        event.ports[0].postMessage({
          count: keys.length,
          size: totalSize,
          sizeFormatted: formatBytes(totalSize),
        });
      })
    );
  }
});

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
