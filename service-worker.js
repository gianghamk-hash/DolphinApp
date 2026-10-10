/* ============================================================
   🚀 DOLPHIN SERVICE WORKER v4 — Network-First cho code
   - HTML/JS/CSS/JSON: Network First → luôn lấy bản mới
   - Ảnh/font: Cache First → nhanh
   - Fallback cache khi offline
   ============================================================ */

const BASE = '/DolphinApp';
const CONFIG_URL = BASE + '/sw-config.json';
const FALLBACK_CACHE = 'dolphin-fallback';

let APP_VERSION = '0.0.0';
let CACHE_NAME = FALLBACK_CACHE;
let configLoaded = false;

const CACHE_URLS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/dolphin-bungalow.html',
  BASE + '/dolphin-lounge.html',
  BASE + '/dolphin-restaurant.html',
  BASE + '/dolphin-show.html',
  BASE + '/manifest.json',
  BASE + '/ranking/index.html',
  BASE + '/caro/index.html',
  BASE + '/staff-sync.js',
  BASE + '/theme-system.js',
  BASE + '/avatar-system.js',
  BASE + '/logo-dolphin.png',
];

async function loadConfig(){
  try {
    const r = await fetch(CONFIG_URL + '?t=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    APP_VERSION = data.version || '0.0.0';
    CACHE_NAME = 'dolphin-v' + APP_VERSION + '-' + Date.now();
    configLoaded = true;
    console.log('[SW] Config loaded: v' + APP_VERSION);
    return true;
  } catch(e) {
    console.warn('[SW] Config load failed:', e);
    APP_VERSION = 'fallback-' + Date.now();
    CACHE_NAME = 'dolphin-' + APP_VERSION;
    return false;
  }
}

self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil((async () => {
    await loadConfig();
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      CACHE_URLS.map(url => cache.add(url).catch(e =>
        console.warn('[SW] Failed to cache:', url, e.message)
      ))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil((async () => {
    if (!configLoaded) await loadConfig();
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('dolphin-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
    console.log('[SW] Activated:', CACHE_NAME);
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // version/config: luôn lấy mới
  if (url.pathname.includes('version.json') || url.pathname.includes('sw-config.json')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (!url.pathname.startsWith(BASE)) return;

  const isCode = /\.(html|js|css|json)$/i.test(url.pathname) ||
                 request.headers.get('accept')?.includes('text/html');

  if (isCode) {
    // ⚡ NETWORK FIRST — luôn thử lấy bản mới, fallback cache khi offline
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match(BASE + '/')))
    );
  } else {
    // Ảnh/font: Cache First
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'FORCE_UPDATE') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('dolphin-')).map(k => caches.delete(k)));
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.postMessage({ type: 'RELOAD_NOW' }));
    })());
  }
});
