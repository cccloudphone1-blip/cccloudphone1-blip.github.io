/* Service Worker Self-Destruct: Hủy đăng ký và dọn sạch cache để web luôn chạy code mới nhất */
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Không can thiệp bất kỳ request nào, để trình duyệt tải trực tiếp từ network
  return;
});
