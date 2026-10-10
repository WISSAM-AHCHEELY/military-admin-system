// ⚠️ مهم جداً: ارفع رقم الإصدار (CACHE_VERSION) مع كل نشر جديد ملموس.
// هذا هو ما يمنع بقاء هاتفك "عالقاً" على نسخة قديمة بعد أي تحديث.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `military-admin-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// عند التثبيت: خزّن الملفات الأساسية فقط، وفعّل النسخة الجديدة فوراً
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// عند التفعيل: احذف أي نسخ (Cache) قديمة من إصدارات سابقة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// استراتيجية الجلب:
// - صفحات HTML (التنقل): Network First → يضمن أنك دائماً تفتح أحدث نسخة عند توفر إنترنت
// - أي ملف آخر (CSS/JS/أيقونات): Cache First مع تحديث في الخلفية → سرعة + يعمل دون اتصال
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
