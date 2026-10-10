// app.js — المرحلة 1: تسجيل Service Worker + اختبار التثبيت كـ PWA
// (الوظائف الإدارية الحقيقية تُضاف في الملفات القادمة ولا توجد هنا بعد)

const swDot = document.getElementById('sw-dot');
const swText = document.getElementById('sw-text');
const installBtn = document.getElementById('install-btn');

// 1) تسجيل الـ Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .then((reg) => {
      swDot.classList.add('ok');
      swText.textContent = 'Service Worker مسجَّل ويعمل بنجاح';
      console.log('[SW] registered, scope:', reg.scope);
    })
    .catch((err) => {
      swDot.classList.add('pending');
      swText.textContent = 'فشل تسجيل Service Worker — راجع التفاصيل في Console';
      console.error('[SW] registration failed:', err);
    });
} else {
  swText.textContent = 'هذا المتصفح لا يدعم Service Worker';
}

// 2) زر التثبيت الصريح (Android Chrome يطلق هذا الحدث عندما يعتبر الصفحة "قابلة للتثبيت")
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.disabled = false;
  installBtn.textContent = 'تثبيت التطبيق الآن';
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] install outcome:', outcome);
  deferredPrompt = null;
  installBtn.disabled = true;
  installBtn.textContent = outcome === 'accepted' ? 'تم التثبيت ✓' : 'تم إلغاء التثبيت';
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] app installed');
});
