const CACHE_NAME = 'habait-v14';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/db.js',
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
  './js/ux.js',
  './js/notifications.js',
  './js/medications.js',
  './js/shopping.js',
  './js/tasks.js',
  './js/budget.js',
  './js/settings.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for our own files so updates appear immediately when online;
// falls back to cache when offline. Cross-origin requests (weather, football)
// are left to the browser.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if (client.url.includes('index.html') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
