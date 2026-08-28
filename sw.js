/* Service Worker — L'Heure du Crime, Console MJ (offline-first) */
const CACHE = 'hdc-mj-v7';
const ASSETS = ['./','./index.html','./style.css','./app.js','./data.json','./favicon.svg','./manifest.json','./vendor/qrcode.js','./audio/horloge.ogg','./audio/orage.ogg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(resp => {
        try { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } catch (_) {}
        return resp;
      }).catch(() => cached || caches.match('./index.html'));
      return cached || net;
    })
  );
});
