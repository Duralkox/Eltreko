const CACHE_NAME = "eltrekoapp-v4";
const PRECACHE_URLS = [
  "/",
  "/start",
  "/logowanie",
  "/odczyty-licznikow",
  "/protokoly",
  "/aplikacja",
  "/manifest.json",
  "/ikona-192.png",
  "/ikona-512.png",
  "/icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === "navigate";
  const isNextAsset = url.pathname.startsWith("/_next/");
  const isStaticAsset = /\.(?:js|css|png|svg|jpg|jpeg|webp|ico|woff2?)$/i.test(url.pathname);

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) => cached || caches.match("/start") || caches.match("/") || caches.match("/logowanie")
          )
        )
    );
    return;
  }

  if (isNextAsset || isStaticAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
