/*  Service Worker for “Wind-Calculator”  */
const CACHE_NAME = 'wind-calculator-cache-v6';

/* ⚠️  ВСЕ пути — ОТНОСИТЕЛЬНЫЕ (без начального “/”) */
const PRECACHE = [
  './',                    // GitHub Pages всегда отдаёт index.html
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',

  /* icons */
  './icons/icons8-prequel-app-64.png',
  './icons/icons8-prequel-app-128.png',
  './icons/icons8-prequel-app-256.png',
  './icons/icons8-prequel-app-512.png',

  /* pictures */
  './pics/action_table.png',
  './pics/action_table_dark.png',
  './pics/coeff_table.png',
  './pics/coeff_table_dark.png',
  './pics/info.png',
  './pics/info_dark.png'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', event => {
  self.skipWaiting();                         // моментальная активация
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE)                  // кэшируем только существующие файлы
    )
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', event => {
  self.clients.claim();                       // берём управление страницей
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.map(n => n !== CACHE_NAME && caches.delete(n))
      )
    )
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', event => {
  const { request } = event;

  // 1) Для переходов по страницам всегда отдаём index.html (SPA-fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
             .then(resp => resp || fetch(request))
    );
    return;
  }

  // 2) Для остальных запросов — Cache-First, затем сеть
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      // если в кэше нет — берём из сети и кладём в кэш
      return fetch(request).then(netResp => {
        if (netResp.ok) {
          const respClone = netResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, respClone));
        }
        return netResp;
      });
    })
  );
});