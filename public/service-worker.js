const CACHE = 'scann-eat-shell-v8';
const SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/i18n.js',
  '/explanations.js',
  '/queue-store.js',
  '/scan-history.js',
  '/allergens.js',
  '/profile.js',
  '/diets.js',
  '/personal-score.js',
  '/consumption.js',
  '/weight-log.js',
  '/meal-templates.js',
  '/engine.bundle.js',
  '/styles.css',
  '/manifest.webmanifest',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache the scoring API — it needs fresh LLM calls.
  if (url.pathname.startsWith('/api/')) return;

  // Stale-while-revalidate for shell assets.
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res.ok && res.type === 'basic') {
              const clone = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }),
    );
  }
});
