// Service worker for My Digital Library by Robiul Hosen.
// Purpose: make the site installable (Add to Home screen) and usable
// offline for the app shell. Book data (data/books.json) is always
// fetched fresh from the network; the shell falls back to cache.
const CACHE = "mdl-shell-v2";
const SHELL = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "logo.webp",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Anything off-site: network only, never cached.
  if (url.origin !== self.location.origin) {
    return;
  }
  // Book data: stale-while-revalidate — show the saved copy instantly,
  // refresh it in the background, so repeat visits open fast on mobile data.
  if (url.pathname.endsWith("books.json")) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const network = fetch(event.request)
            .then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
