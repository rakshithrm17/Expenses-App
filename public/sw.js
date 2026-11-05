const CACHE_NAME = "where-it-goes-v2-cache";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  // Do not intercept Firestore, Google APIs, or external cloud requests
  if (
    url.origin.includes("firestore") ||
    url.origin.includes("googleapis.com") ||
    url.origin.includes("firebase")
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, toCache));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

