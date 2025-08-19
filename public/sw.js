const CACHE = 'blindado-v1';
const PRECACHE = [
  '/client.html',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/functions/v1/')) {
    // network-first for API
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // cache-first for app shell
  e.respondWith(
    caches.match(e.request).then((m) => m || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }))
  );
});
