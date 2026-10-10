/* ============================================================
   Dolphin PWA Service Worker v1.0
   Dành cho GitHub Pages — subfolder /DolphinApp/
   ============================================================ */

const CACHE_NAME = 'dolphin-v2.5.7';
const BASE = '/DolphinApp';
const CACHE_URLS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/dolphin-bungalow.html',
  BASE + '/dolphin-lounge.html',
  BASE + '/dolphin-restaurant.html',
  BASE + '/dolphin-show.html',
  BASE + '/manifest.json',
   BASE + '/logo-dolphin.png',
   BASE + '/staff-sync.js',
  BASE + '/community-chat.js',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(CACHE_URLS).catch(err => {
          console.warn('[SW] Some files failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    s.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== _NAME) {
            console.log('[SW] Removing old :', key);
            return s.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bỏ qua request không phải GET
  if (request.method !== 'GET') return;

  // Bỏ qua các domain bên ngoài — luôn đi mạng (Firebase realtime)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.tailwindcss.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('open-meteo.com')
  ) {
    return;
  }

  // Chỉ xử lý request cùng origin
  if (url.origin !== self.location.origin) return;

  // Chỉ cache các file trong /DolphinApp/
  if (!url.pathname.startsWith(BASE)) return;
     // KHÔNG cache version.json — luôn lấy bản mới
  if (url.pathname.indexOf('version.json') >= 0) return;

  const isHTML = request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    // Network First cho HTML
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match(BASE + '/')))
    );
  } else {
    // Cache First cho assets
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
