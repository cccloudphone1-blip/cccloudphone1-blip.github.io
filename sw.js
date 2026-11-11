/* Service worker: cache app shell, bỏ qua request khác origin */
const SHELL = 'kp-shell-v5-qa2';
const ASSETS = ['/', '/assets/app.js?v=20261111_qa2', '/assets/style.css?v=20261111_qa2', '/brand/khophim-logo-v2.png', '/brand/khophim-favicon-v2-96.png', '/site.webmanifest', '/manifest.json', '/brand/poster-placeholder.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Chỉ xử lý request cùng origin. Supabase / CDN / player để trình duyệt tự lo
  // (chèn SW vào request có header Range từng làm response treo).
  if (url.origin !== location.origin) return;

  // điều hướng SPA: network-first, offline trả shell
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }

  // JS/CSS của app: network-first (tránh cache bản cũ khi vừa sửa)
  if (url.origin === location.origin && /\.(js|css)$/.test(url.pathname)) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // tài nguyên tĩnh: cache-first
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit))
    );
  }
});
