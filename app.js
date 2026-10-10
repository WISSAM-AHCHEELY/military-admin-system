// app.js — المرحلة 2: Service Worker + تسجيل دخول حقيقي + اختبار قاعدة بيانات حقيقي
import { login, logout, watchAuthState } from "./auth.js";
import { testConnection } from "./db.js";

const swDot = document.getElementById('sw-dot');
const swText = document.getElementById('sw-text');
const fbDot = document.getElementById('fb-dot');
const fbText = document.getElementById('fb-text');

const loginCard = document.getElementById('login-card');
const dashboardCard = document.getElementById('dashboard-card');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');
const testDbBtn = document.getElementById('test-db-btn');
const testDbResult = document.getElementById('test-db-result');

let currentUser = null;

// 1) تسجيل Service Worker (كما في المرحلة 1)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .then(() => {
      swDot.classList.add('ok');
      swText.textContent = 'Service Worker مسجَّل ويعمل بنجاح';
    })
    .catch((err) => {
      swDot.classList.add('pending');
      swText.textContent = 'فشل تسجيل Service Worker';
      console.error('[SW]', err);
    });
} else {
  swText.textContent = 'هذا المتصفح لا يدعم Service Worker';
}

// 2) مراقبة حالة تسجيل الدخول الحقيقية من Firebase
fbText.textContent = 'في انتظار تسجيل الدخول للتحقق من الاتصال…';
fbDot.classList.add('pending');

watchAuthState((user) => {
  currentUser = user;
  if (user) {
    loginCard.style.display = 'none';
    dashboardCard.style.display = 'block';
    userEmailEl.textContent = user.email;
    userRoleEl.textContent = user.profile
      ? `الدور: ${user.profile.role || 'غير محدد'} — ${user.profile.active ? 'نشط' : 'موقوف'}`
      : '⚠️ لا يوجد مستند مطابق في users/{uid} — راجع BUILD_STATUS';
    fbDot.classList.remove('pending');
    fbDot.classList.add('ok');
    fbText.textContent = 'Firebase متصل — تسجيل الدخول نجح فعليًا';
  } else {
    loginCard.style.display = 'block';
    dashboardCard.style.display = 'none';
    testDbResult.style.display = 'none';
  }
});

// 3) تسجيل الدخول الحقيقي
loginBtn.addEventListener('click', async () => {
  loginError.style.display = 'none';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    loginError.textContent = 'أدخل البريد وكلمة المرور.';
    loginError.style.display = 'block';
    return;
  }
  loginBtn.disabled = true;
  loginBtn.textContent = 'جاري الدخول…';
  try {
    await login(email, password);
    // watchAuthState سيحدّث الواجهة تلقائيًا بعد النجاح
  } catch (err) {
    console.error('[login]', err.code, err.message);
    loginError.textContent = 'فشل تسجيل الدخول: ' + (err.code || err.message);
    loginError.style.display = 'block';
    fbDot.classList.remove('ok');
    fbDot.classList.add('pending');
    fbText.textContent = 'فشل الاتصال/الدخول — راجع رسالة الخطأ أعلاه';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'دخول';
  }
});

// 4) تسجيل الخروج
logoutBtn.addEventListener('click', () => logout());

// 5) اختبار حقيقي لقاعدة البيانات (كتابة + قراءة فعليتان، ليستا وهميتين)
testDbBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  testDbBtn.disabled = true;
  testDbBtn.textContent = 'جاري الاختبار…';
  testDbResult.style.display = 'block';
  testDbResult.textContent = 'جاري الكتابة إلى Firestore ثم القراءة منه…';
  try {
    const data = await testConnection(currentUser.uid);
    testDbResult.textContent = '✅ نجح الاتصال فعليًا — البيانات المُستردة من Firestore:\n' + JSON.stringify(data, null, 2);
  } catch (err) {
    testDbResult.textContent = '❌ فشل الاتصال: ' + (err.code || err.message) + '\n\nإذا كانت الرسالة "Missing or insufficient permissions" فتحقق أن مستند users/' + currentUser.uid + ' موجود وفيه active: true.';
    console.error('[testConnection]', err);
  } finally {
    testDbBtn.disabled = false;
    testDbBtn.textContent = 'اختبار الاتصال الحقيقي بقاعدة البيانات';
  }
});
