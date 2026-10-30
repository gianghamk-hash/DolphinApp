/* BUILD: 2026-10-30-0909 */
/* ============================================================
   🚀 DOLPHIN SERVICE WORKER v5 — Network-First cho code
   - HTML/JS/CSS/JSON: Network First → luôn lấy bản mới
   - Ảnh/font: Cache First → nhanh
   - Fallback cache khi offlinVe
   - Đọc version từ sw-config.json (single source of truth)
   ============================================================ */

const BASE = new URL('./',self.location.href).pathname.replace(/\/$/,'');
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
  BASE + '/dolphin-alerts.js?v=1',
  BASE + '/push-config.js',
  BASE + '/dolphin-push.js',
  BASE + '/staff-id.js?v=1.1',
  BASE + '/dolphin-navigation.js?v=1',
  BASE + '/theme-system.js',
  BASE + '/avatar-system.js',
  BASE + '/dolphin-ui.js',
  BASE + '/dolphin-clock-extras.js',
  BASE + '/staff-online.js',
  BASE + '/logo-dolphin.png',
  BASE + '/sw-config.json'
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
  if (url.pathname.includes('version.json') ||
      url.pathname.includes('sw-config.json') ||
      url.pathname.includes('changelog.json') ||
      url.pathname.includes('changelog-history.json')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (!url.pathname.startsWith(BASE)) return;

  const isCode = /\.(html|js|css|json)$/i.test(url.pathname) ||
                 (request.headers.get('accept') || '').includes('text/html');

  if (isCode) {
    // ⚡ NETWORK FIRST
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
    // Cache First cho ảnh/font
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

// Data-only FCM Web Push is handled by the existing Dolphin service worker.
// No external importScripts: an offline CDN must never prevent this SW from installing.
self.addEventListener('push', event => {
  if (!event.data) return;
  let envelope;
  try { envelope = event.data.json(); } catch (err) { return; }
  const payload = envelope && (envelope.data || envelope);
  if (!payload || payload.type !== 'dolphin-order') return;
  event.waitUntil((async () => {
    // Apple iOS Home Screen web apps require every received push to be user-visible.
    // Never swallow a push just because Dolphin is open in a foreground tab.
    const options = {
      body: String(payload.body || 'Mở Dolphin để xem yêu cầu mới.').slice(0,180),
      tag: String(payload.tag || payload.eventId || ''),
      icon: BASE + '/pwa-icons/icon-192.png.png',
      badge: BASE + '/pwa-icons/icon-96.png.png',
      data: {url: payload.url || BASE + '/'},
      renotify: false
    };
    await self.registration.showNotification(String(payload.title || 'Dolphin · Thông báo mới').slice(0,100),options);
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const requested = event.notification.data && event.notification.data.url;
    let target;
    try {
      target = new URL(requested || BASE + '/', self.location.origin);
      if (target.origin !== self.location.origin || !target.pathname.startsWith(BASE + '/'))
        target = new URL(BASE + '/', self.location.origin);
    } catch(e) {target = new URL(BASE + '/',self.location.origin);}
    const windows = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    const existing = windows.find(c => new URL(c.url).origin === target.origin);
    if (existing) {
      await existing.focus();
      if (existing.navigate) await existing.navigate(target.href);
      return;
    }
    return self.clients.openWindow(target.href);
  })());
});
