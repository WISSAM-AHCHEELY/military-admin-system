// app.js — المرحلة 4: Service Worker + دخول حقيقي + إدارة مستخدمين وصلاحيات حقيقية
import { login, logout, watchAuthState } from "./auth.js";
import { listUsers, upsertUserProfile } from "./users.js";
import { ROLES, can } from "./permissions.js";

const swDot = document.getElementById('sw-dot');
const swText = document.getElementById('sw-text');
const fbDot = document.getElementById('fb-dot');
const fbText = document.getElementById('fb-text');

const loginCard = document.getElementById('login-card');
const dashboardCard = document.getElementById('dashboard-card');
const usersCard = document.getElementById('users-card');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');

const uUid = document.getElementById('u-uid');
const uName = document.getElementById('u-name');
const uEmail = document.getElementById('u-email');
const uRole = document.getElementById('u-role');
const uActive = document.getElementById('u-active');
const uSaveBtn = document.getElementById('u-save-btn');
const uSaveMsg = document.getElementById('u-save-msg');
const usersList = document.getElementById('users-list');

let currentUser = null;

// تعبئة قائمة الأدوار من permissions.js (مصدر حقيقة واحد، لا تكرار يدوي)
Object.entries(ROLES).forEach(([key, label]) => {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = label;
  uRole.appendChild(opt);
});

// 1) Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => { swDot.classList.add('ok'); swText.textContent = 'Service Worker مسجَّل ويعمل بنجاح'; })
    .catch((err) => { swDot.classList.add('pending'); swText.textContent = 'فشل تسجيل Service Worker'; console.error(err); });
} else {
  swText.textContent = 'هذا المتصفح لا يدعم Service Worker';
}

// 2) حالة الدخول
fbDot.classList.add('pending');
fbText.textContent = 'في انتظار تسجيل الدخول…';

watchAuthState(async (user) => {
  currentUser = user;
  if (user) {
    loginCard.style.display = 'none';
    dashboardCard.style.display = 'block';
    userEmailEl.textContent = user.email;
    userRoleEl.textContent = user.profile
      ? `الدور: ${ROLES[user.profile.role] || user.profile.role} — ${user.profile.active ? 'نشط' : 'موقوف'}`
      : '⚠️ لا يوجد ملف صلاحيات لهذا الحساب';
    fbDot.classList.remove('pending');
    fbDot.classList.add('ok');
    fbText.textContent = 'Firebase متصل — تسجيل الدخول نجح فعليًا';

    // إظهار قسم إدارة المستخدمين فقط لمن يملك صلاحية manage_users فعليًا
    // (هذا تحسين تجربة استخدام فقط — المنع الحقيقي مفروض في firestore.rules)
    if (can(user.profile, 'manage_users')) {
      usersCard.style.display = 'block';
      await refreshUsersList();
    } else {
      usersCard.style.display = 'none';
    }
  } else {
    loginCard.style.display = 'block';
    dashboardCard.style.display = 'none';
    usersCard.style.display = 'none';
  }
});

// 3) تسجيل الدخول
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
  } catch (err) {
    loginError.textContent = 'فشل تسجيل الدخول: ' + (err.code || err.message);
    loginError.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'دخول';
  }
});

logoutBtn.addEventListener('click', () => logout());

// 4) إدارة المستخدمين — قراءة حقيقية من Firestore
async function refreshUsersList() {
  usersList.textContent = 'جاري التحميل…';
  try {
    const users = await listUsers();
    if (users.length === 0) {
      usersList.textContent = 'لا يوجد مستخدمون بعد.';
      return;
    }
    usersList.innerHTML = '';
    users.forEach((u) => {
      const row = document.createElement('div');
      row.className = 'status-row';
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <span class="dot ${u.active ? 'ok' : 'pending'}"></span>
        <span>${u.name || '(بلا اسم)'} — ${ROLES[u.role] || u.role || '—'} ${u.email ? '— ' + u.email : ''}</span>
      `;
      row.addEventListener('click', () => {
        uUid.value = u.uid;
        uName.value = u.name || '';
        uEmail.value = u.email || '';
        uRole.value = u.role || 'viewer';
        uActive.checked = !!u.active;
      });
      usersList.appendChild(row);
    });
  } catch (err) {
    usersList.textContent = '❌ فشل تحميل المستخدمين: ' + (err.code || err.message);
    console.error(err);
  }
}

// 5) حفظ (إنشاء/تعديل) ملف صلاحيات مستخدم — كتابة حقيقية في Firestore
uSaveBtn.addEventListener('click', async () => {
  uSaveMsg.style.display = 'none';
  const uid = uUid.value.trim();
  if (!uid) {
    uSaveMsg.textContent = 'أدخل الـ UID أولاً (من Firebase Authentication).';
    uSaveMsg.style.color = 'var(--danger)';
    uSaveMsg.style.display = 'block';
    return;
  }
  uSaveBtn.disabled = true;
  uSaveBtn.textContent = 'جاري الحفظ…';
  try {
    await upsertUserProfile(uid, {
      name: uName.value.trim(),
      email: uEmail.value.trim(),
      role: uRole.value,
      active: uActive.checked
    });
    uSaveMsg.textContent = '✅ تم الحفظ فعليًا في Firestore.';
    uSaveMsg.style.color = 'var(--green)';
    uSaveMsg.style.display = 'block';
    await refreshUsersList();
  } catch (err) {
    uSaveMsg.textContent = '❌ فشل الحفظ: ' + (err.code || err.message);
    uSaveMsg.style.color = 'var(--danger)';
    uSaveMsg.style.display = 'block';
    console.error(err);
  } finally {
    uSaveBtn.disabled = false;
    uSaveBtn.textContent = 'حفظ المستخدم';
  }
});
