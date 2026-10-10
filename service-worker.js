/* ============================================================
   🚀 DOLPHIN SERVICE WORKER v3 — Auto version
   - Tự đọc version từ sw-config.json
   - Tự xóa cache khi version thay đổi
   - Không cần đổi CACHE_NAME tay
   ============================================================ */

const BASE = '/DolphinApp';
const CONFIG_URL = BASE + '/sw-config.json';
const FALLBACK_CACHE = 'dolphin-fallback';

// Runtime values
let APP_VERSION = '0.0.0';
let CACHE_NAME = FALLBACK_CACHE;
let configLoaded = false;

// Danh sách file cần cache
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
  BASE + '/community-chat.js',
  BASE + '/theme-system.js',
  BASE + '/avatar-system.js',
  BASE + '/logo-dolphin.png',
  BASE + '/changelog.json',
  BASE + '/changelog-history.json',
  BASE + '/sw-config.json', 
];

// ═══════ ĐỌC VERSION TỪ CONFIG ═══════
async function loadConfig(){
  try {
    const r = await fetch(CONFIG_URL + '?t=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    APP_VERSION = data.version || '0.0.0';
    CACHE_NAME = 'dolphin-v' + APP_VERSION;
    configLoaded = true;
    console.log('[SW] Config loaded: v' + APP_VERSION);
    return true;
  } catch(e) {
    console.warn('[SW] Config load failed:', e);
    // Fallback: dùng timestamp làm version
    APP_VERSION = 'fallback-' + Date.now();
    CACHE_NAME = 'dolphin-' + APP_VERSION;
    return false;
  }
}

// ═══════ INSTALL ═══════
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil((async () => {
    await loadConfig();
    console.log('[SW] Cache name:', CACHE_NAME);

    const cache = await caches.open(CACHE_NAME);
    console.log('[SW] Caching app shell...');

    // Cache từng file, không fail toàn bộ nếu 1 file lỗi
    const results = await Promise.allSettled(
      CACHE_URLS.map(url => cache.add(url).catch(e => {
        console.warn('[SW] Failed to cache:', url, e.message);
      }))
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    console.log('[SW] Cached ' + success + '/' + CACHE_URLS.length + ' files');

    await self.skipWaiting();
  })());
});

// ═══════ ACTIVATE ═══════
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil((async () => {
    // Đảm bảo đã đọc config
    if (!configLoaded) await loadConfig();

    // Xóa tất cả cache cũ (khác CACHE_NAME hiện tại)
    const keys = await caches.keys();
    const deletePromises = [];
    for (const key of keys) {
      if (key.startsWith('dolphin-') && key !== CACHE_NAME) {
        console.log('[SW] Deleting old cache:', key);
        deletePromises.push(caches.delete(key));
      }
    }
    await Promise.all(deletePromises);

    await self.clients.claim();
    console.log('[SW] Activated with cache:', CACHE_NAME);

    // Thông báo cho tất cả client đang mở
    const clients = await self.clients.matchAll();
    clients.forEach(c => {
      c.postMessage({
        type: 'SW_ACTIVATED',
        version: APP_VERSION
      });
    });
  })());
});

// ═══════ FETCH ═══════
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Bỏ qua non-GET
  if (request.method !== 'GET') return;

  // Bỏ qua domain ngoài
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
  ) return;

  // Chỉ xử lý same-origin
  if (url.origin !== self.location.origin) return;

  // Bỏ qua version.json và sw-config.json — luôn lấy mới
  if (url.pathname.indexOf('version.json') >= 0 || url.pathname.indexOf('sw-config.json') >= 0) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Chỉ cache trong /DolphinApp/
  if (!url.pathname.startsWith(BASE)) return;

  const isHTML = request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    // Network First cho HTML
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
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
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});

// ═══════ MESSAGE HANDLER ═══════
self.addEventListener('message', event => {
  const data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'GET_VERSION') {
    event.source?.postMessage({
      type: 'VERSION_INFO',
      version: APP_VERSION,
      cacheName: CACHE_NAME
    });
  }

  if (data.type === 'CHECK_UPDATE') {
    event.waitUntil((async () => {
      const oldVersion = APP_VERSION;
      const oldCache = CACHE_NAME;
      await loadConfig();
      if (CACHE_NAME !== oldCache) {
        console.log('[SW] Update detected:', oldVersion, '→', APP_VERSION);
        const clients = await self.clients.matchAll();
        clients.forEach(c => {
          c.postMessage({
            type: 'NEW_VERSION',
            oldVersion: oldVersion,
            newVersion: APP_VERSION
          });
        });
      }
    })());
  }

  if (data.type === 'FORCE_UPDATE') {
    event.waitUntil((async () => {
      await loadConfig();
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('dolphin-')).map(k => caches.delete(k)));
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.postMessage({ type: 'RELOAD_NOW' }));
    })());
  }
});
