const CACHE_NAME = 'chan-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/design-system.css',
  './css/components.css',
  './js/audio.js',
  './js/storage.js',
  './js/quests.js',
  './js/timer.js',
  './js/diary.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => cachedResponse);
    })
  );
});
