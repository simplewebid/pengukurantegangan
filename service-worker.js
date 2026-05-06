/* Simple offline-first service worker (public site, no login). */

// Bump this when you deploy changes, so clients refresh cached assets.
const CACHE_NAME = "pengukuranlistrik-v3";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./materi.html",
  "./prosedur.html",
  "./simulasi.html",
  "./simulasi-kesalahan.html",
  "./kuis.html",
  "./tentang.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./logoftunp.png",
  "./afri.png",
  "./selsa.png",
  "./suci.png",
  "./offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("message", (event) => {
  if (event?.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? Promise.resolve() : caches.delete(key))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation requests: try network, fallback to cache, then offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match("./offline.html"));
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  // Return cache immediately (fast), but update in background (fresh).
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        // Update cache in background
        fetchPromise;
        return cached;
      }

      const network = await fetchPromise;
      return network || cached || Response.error();
    })()
  );
});
