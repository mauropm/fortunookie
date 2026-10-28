/* Fortune Cookie service worker.
 * Strategy:
 *  - Navigations: network-first, cached shell fallback (offline works).
 *  - Hashed build assets + icons: cache-first (immutable filenames).
 *  - Fortune/locale JSON: cache-first, but revalidated in background.
 * CACHE_VERSION is stamped by the Vite build (closeBundle plugin) so every
 * deploy invalidates the old cache cleanly.
 */
const CACHE_VERSION = "PLACEHOLDER_BUILD_ID";
const CACHE_NAME = `fortunookie-${CACHE_VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App shell: network-first so deploys appear immediately.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Static assets and content JSON: cache-first with background revalidate.
  const cacheable =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fortunes/") ||
    url.pathname.startsWith("/locales/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(css|js|json|png|svg|woff2)$/.test(url.pathname);

  if (!cacheable) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
