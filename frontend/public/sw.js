self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("eltrekoapp-v1").then((cache) =>
      cache.addAll(["/", "/logowanie", "/manifest.json", "/ikona-192.png", "/ikona-512.png"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== "eltrekoapp-v1").map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const taSamaDomena = url.origin === self.location.origin;
  const nawigacja = event.request.mode === "navigate";

  if (!taSamaDomena) return;

  // Fallback HTML tylko dla nawigacji, aby nie podmieniać CSS/JS odpowiedzią strony.
  if (nawigacja) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open("eltrekoapp-v1").then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/logowanie")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open("eltrekoapp-v1").then((cache) => cache.put(event.request, cloned));
        }
        return response;
      });
    })
  );
});
