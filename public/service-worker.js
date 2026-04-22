const CACHE = 'scann-eat-shell-db56ed8';
const SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/core/i18n.js',
  '/core/explanations.js',
  '/data/queue-store.js',
  '/data/scan-history.js',
  '/core/allergens.js',
  '/data/profile.js',
  '/core/diets.js',
  '/core/personal-score.js',
  '/data/consumption.js',
  '/data/weight-log.js',
  '/data/meal-templates.js',
  '/data/recipes.js',
  '/data/activity.js',
  '/data/custom-food-db.js',
  '/data/pairings.js',
  '/backup.js',
  '/profiles.js',
  '/data/food-db.js',
  '/core/telemetry.js',
  '/core/app-settings.js',
  '/features/hydration.js',
  '/features/fasting-history.js',
  '/features/day-notes.js',
  '/features/grocery-list.js',
  '/features/meal-plan.js',
  '/features/activity.js',
  '/core/presenters.js',
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

// Temporary holding area for files a user shared via the PWA share_target.
// The browser POSTs the shared files to '/', which we intercept here, stash
// in-memory, and hand to the app on its next message.
let sharedFilesBuffer = null;

self.addEventListener('message', (event) => {
  // The app asks for any pending shared files right after load. Hand them
  // over once and clear the buffer so a later reload doesn't see stale data.
  if (event.data === 'shared-files?') {
    event.ports[0]?.postMessage(sharedFilesBuffer);
    sharedFilesBuffer = null;
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Share target: the user shared one or more images from their gallery to
  // Scann-eat. Extract the files, buffer them, and redirect the browser to
  // "/?shared=1" so the app knows to pull from the buffer on load.
  if (request.method === 'POST' && url.pathname === '/') {
    event.respondWith((async () => {
      try {
        const formData = await request.formData();
        const files = formData.getAll('shared_images');
        // Ensure they are actual File objects (spec allows strings too).
        sharedFilesBuffer = files.filter((f) => f instanceof File);
      } catch { sharedFilesBuffer = null; }
      return Response.redirect('/?shared=1', 303);
    })());
    return;
  }

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
          .catch(() => {
            // Network failed. If we have a cached copy, hand it back; else
            // return a synthetic 504 so the promise resolves to a Response
            // instead of undefined (which would crash the fetch handler).
            if (cached) return cached;
            return new Response('Offline and not cached', {
              status: 504,
              statusText: 'Gateway Timeout',
              headers: { 'Content-Type': 'text/plain' },
            });
          });
        return cached || fetchPromise;
      }),
    );
  }
});
