const CACHE_NAME = 'habait-v55';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/db.js',
  './js/activity.js',
  './js/sync.js',
  './js/weather.js',
  './js/jewish.js',
  './js/beitar.js',
  './js/calendar.js',
  './js/events.js',
  './js/habits.js',
  './js/goals.js',
  './js/schedule.js',
  './js/maintenance.js',
  './js/meals.js',
  './js/growth.js',
  './js/stars.js',
  './js/savings.js',
  './js/quickadd.js',
  './js/nlu.js',
  './js/ai.js',
  './js/focus.js',
  './js/ux.js',
  './js/notifications.js',
  './js/medications.js',
  './js/shopping.js',
  './js/tasks.js',
  './js/budget.js',
  './js/settings.js',
  './js/foodbrain.js',
  './js/assistant.js',
  './js/agents.js',
  './js/autopilot.js',
  './js/briefing.js',
  './js/dashlayout.js',
  './js/dashedit.js',
  './js/weekly.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const PRECACHED_URLS = new Set(ASSETS.map((asset) => new URL(asset, self.location.href).href));

function acceptsHtml(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

function cacheKeyFor(req) {
  const url = new URL(req.url);
  if (acceptsHtml(req)) return './index.html';
  url.search = '';
  url.hash = '';
  return PRECACHED_URLS.has(url.href) ? url.href : null;
}

// Network-first for our own files so updates appear immediately when online;
// falls back to the right cached asset when offline. Cross-origin requests
// (weather, football, fonts) are left to the browser.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const key = cacheKeyFor(req);
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && key) {
          const clone = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(key, clone)));
        }
        return res;
      })
      .catch(() => {
        if (!key) return Response.error();
        return caches.match(key).then((cached) => cached || (acceptsHtml(req) ? caches.match('./index.html') : Response.error()));
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
