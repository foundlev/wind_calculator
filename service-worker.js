const CACHE_NAME = "wind-calculator-cache-v1";
const CACHE_URLS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/icons/icons8-prequel-app-64.png",
  "/icons/icons8-prequel-app-128.png",
  "/icons/icons8-prequel-app-256.png",
  "/icons/icons8-prequel-app-512.png",
  "/pics/action_table.png",
  "/pics/action_table_dark.png",
  "/pics/coeff_table.png",
  "/pics/coeff_table_dark.png"
];

// Устанавливаем Service Worker и кэшируем файлы
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS);
    })
  );
});

// Активируем Service Worker и удаляем старые кэши
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Обрабатываем запросы: берем из кэша или из сети
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
