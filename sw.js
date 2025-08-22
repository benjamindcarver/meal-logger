// sw.js
self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Start controlling pages right away
  event.waitUntil(self.clients.claim());
});

// Helper: is this an HTML navigation request?
function isHTMLRequest(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never mess with non-GET or cross-origin requests
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // 1) Network-first for HTML (index and route navigations)
  if (isHTMLRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          // update cache in background
          caches.open('html-cache').then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
        .catch(() => new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } }))
    );
    return;
  }

  // 2) Stale-while-revalidate for other same-origin assets (manifest, icons, etc.)
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        const copy = networkRes.clone();
        caches.open('asset-cache').then((c) => c.put(req, copy));
        return networkRes;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
