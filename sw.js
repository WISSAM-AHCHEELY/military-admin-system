// ⚠️ مهم جداً: ارفع رقم الإصدار (CACHE_VERSION) مع كل نشر جديد ملموس.
// هذا هو ما يمنع بقاء هاتفك "عالقاً" على نسخة قديمة بعد أي تحديث.
const CACHE_VERSION = 'v9'; // ...، v8=المرحلة9 (attendance.js)، v9=المرحلة8 (cloudinary.js, documents.js) + إصلاح تخزين طلبات POST
const CACHE_NAME = `military-admin-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './auth.js',
  './db.js',
  './firebase-config.js',
  './permissions.js',
  './users.js',
  './units.js',
  './personnel.js',
  './serviceEvents.js',
  './leaves.js',
  './attendance.js',
  './cloudinary.js',
  './documents.js',
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
// - أي ملف آخر (CSS/JS/أيقونات/طلبات Firebase): Cache First مع تحديث في الخلفية
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

  // لا نتدخل في طلبات Firebase أو Cloudinary نفسها — تُترك تمر مباشرة للشبكة
  // (بيانات حيّة أو رفع ملفات، وليست ملفات ثابتة يصح تخزينها مؤقتاً)
  const url = new URL(request.url);
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('cloudinary.com')
  ) {
    return; // لا event.respondWith() = يمر الطلب كالمعتاد بدون اعتراض
  }

  // Cache API يرفض تخزين أي طلب غير GET (مثل رفع ملف بـ POST) — تفادي ذلك صراحة
  if (request.method !== 'GET') {
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
