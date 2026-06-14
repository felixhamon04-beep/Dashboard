// Live Commute — offline shell service worker.
// Strategy: network-first for the page itself, so when you're online you always
// get the latest version (no stale-cache surprises), and when you're offline you
// get the last copy that loaded. API/font requests are left to the browser and
// simply fail gracefully with no signal — the Offline view needs none of them.

const CACHE = 'live-commute-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Only manage same-origin page/navigation requests for the offline shell.
  const isDocument = req.mode === 'navigate' || req.destination === 'document';
  if (url.origin !== self.location.origin || !isDocument) return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return resp;
      })
      .catch(() =>
        caches.match(req).then((r) => r || caches.match(url.pathname) || caches.match('./'))
      )
  );
});
