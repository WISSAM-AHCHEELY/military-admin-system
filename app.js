// app.js — المرحلة 5: إضافة وحدة "المنتسبون" الوظيفية الحقيقية الأولى
import { login, logout, watchAuthState } from "./auth.js";
import { listUsers, upsertUserProfile } from "./users.js";
import { ROLES, can } from "./permissions.js";
import { listUnits, createUnit } from "./units.js";
import { listPersonnel, createPersonnel, updatePersonnel, deletePersonnel } from "./personnel.js";

const swDot = document.getElementById('sw-dot');
const swText = document.getElementById('sw-text');
const fbDot = document.getElementById('fb-dot');
const fbText = document.getElementById('fb-text');

const mainNav = document.getElementById('main-nav');
const loginCard = document.getElementById('login-card');
const navUsersBtn = document.getElementById('nav-users-btn');

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');
const statPersonnelCount = document.getElementById('stat-personnel-count');

let currentUser = null;
let unitsCache = [];
let personnelCache = [];

// ---------- 1) Service Worker ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => { swDot.classList.add('ok'); swText.textContent = 'Service Worker مسجَّل ويعمل بنجاح'; })
    .catch((err) => { swDot.classList.add('pending'); swText.textContent = 'فشل تسجيل Service Worker'; console.error(err); });
} else {
  swText.textContent = 'هذا المتصفح لا يدعم Service Worker';
}

// ---------- 2) التنقل بين التبويبات ----------
const tabs = {
  home: document.getElementById('tab-home'),
  personnel: document.getElementById('tab-personnel'),
  users: document.getElementById('tab-users')
};
function showTab(name) {
  Object.entries(tabs).forEach(([key, el]) => { el.style.display = key === name ? 'block' : 'none'; });
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === name));
  if (name === 'personnel') refreshPersonnelList();
  if (name === 'users') refreshUsersList();
}
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

// ---------- 3) حالة الدخول ----------
fbDot.classList.add('pending');
fbText.textContent = 'في انتظار تسجيل الدخول…';

watchAuthState(async (user) => {
  currentUser = user;
  if (user) {
    loginCard.style.display = 'none';
    mainNav.style.display = 'flex';
    userEmailEl.textContent = user.email;
    userRoleEl.textContent = user.profile
      ? `الدور: ${ROLES[user.profile.role] || user.profile.role} — ${user.profile.active ? 'نشط' : 'موقوف'}`
      : '⚠️ لا يوجد ملف صلاحيات لهذا الحساب';
    fbDot.classList.remove('pending');
    fbDot.classList.add('ok');
    fbText.textContent = 'Firebase متصل — تسجيل الدخول نجح فعليًا';

    navUsersBtn.style.display = can(user.profile, 'manage_users') ? 'block' : 'none';
    document.getElementById('p-add-btn').style.display = can(user.profile, 'create') ? 'inline-block' : 'none';

    await loadUnitsIntoSelect();
    await refreshPersonnelCountStat();
    showTab('home');
  } else {
    loginCard.style.display = 'block';
    mainNav.style.display = 'none';
    Object.values(tabs).forEach((el) => (el.style.display = 'none'));
  }
});

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

// ---------- 4) الوحدات (قائمة بسيطة من قاعدة البيانات) ----------
async function loadUnitsIntoSelect() {
  const sel = document.getElementById('p-unitId');
  try {
    unitsCache = await listUnits();
    sel.innerHTML = '<option value="">— بدون وحدة محددة —</option>';
    if (unitsCache.length === 0) {
      // لا توجد وحدات بعد — نضيف طريقة سريعة لإنشاء أول وحدة عبر prompt (مؤقت حتى مرحلة "إدارة الوحدات" الكاملة)
      const opt = document.createElement('option');
      opt.textContent = 'لا توجد وحدات بعد — أضف واحدة من "إضافة منتسب"';
      opt.disabled = true;
      sel.appendChild(opt);
    }
    unitsCache.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name;
      sel.appendChild(opt);
    });
    const addUnitOpt = document.createElement('option');
    addUnitOpt.value = '__new__';
    addUnitOpt.textContent = '+ إضافة وحدة جديدة…';
    sel.appendChild(addUnitOpt);
  } catch (err) {
    console.error('[units]', err);
  }
}
document.getElementById('p-unitId').addEventListener('change', async (e) => {
  if (e.target.value === '__new__') {
    const name = prompt('اسم الوحدة الجديدة:');
    e.target.value = '';
    if (name && name.trim()) {
      await createUnit(name);
      await loadUnitsIntoSelect();
    }
  }
});

// ---------- 5) إحصائية لوحة الرئيسية (حقيقية، ليست رقماً ثابتاً) ----------
async function refreshPersonnelCountStat() {
  try {
    const list = await listPersonnel();
    personnelCache = list;
    statPersonnelCount.textContent = `عدد المنتسبين: ${list.length}`;
  } catch (err) {
    statPersonnelCount.textContent = 'تعذّر حساب عدد المنتسبين: ' + (err.code || err.message);
  }
}

// ---------- 6) نموذج إضافة/تعديل منتسب ----------
const formCard = document.getElementById('personnel-form-card');
const formTitle = document.getElementById('personnel-form-title');
const pFields = ['fullName','motherName','serviceNumber','category','rank','corps','specialty','unitId','position','phone','birthDate','birthPlace','address','province','joinDate','status','notes'];

function clearForm() {
  document.getElementById('p-id').value = '';
  pFields.forEach((f) => { document.getElementById('p-' + f).value = ''; });
  document.getElementById('p-category').value = 'officer';
  document.getElementById('p-status').value = 'present';
}

document.getElementById('p-add-btn').addEventListener('click', () => {
  clearForm();
  formTitle.textContent = 'إضافة منتسب جديد';
  formCard.style.display = 'block';
});
document.getElementById('p-cancel-btn').addEventListener('click', () => {
  formCard.style.display = 'none';
});

document.getElementById('p-save-btn').addEventListener('click', async () => {
  const msg = document.getElementById('p-save-msg');
  msg.style.display = 'none';
  const fullName = document.getElementById('p-fullName').value.trim();
  const serviceNumber = document.getElementById('p-serviceNumber').value.trim();
  if (!fullName || !serviceNumber) {
    msg.textContent = 'الاسم والرقم الوظيفي حقلان إلزاميان.';
    msg.style.color = 'var(--danger)';
    msg.style.display = 'block';
    return;
  }
  // منع تكرار الرقم الوظيفي (بند 35 من المتطلبات) — تحقق على مستوى الواجهة أولاً
  const id = document.getElementById('p-id').value;
  const dup = personnelCache.find((p) => p.serviceNumber === serviceNumber && p.id !== id);
  if (dup) {
    msg.textContent = `⚠️ قد يكون هذا المنتسب موجوداً مسبقاً (${dup.fullName}) بنفس الرقم الوظيفي.`;
    msg.style.color = 'var(--gold)';
    msg.style.display = 'block';
    return;
  }

  const data = {};
  pFields.forEach((f) => { data[f] = document.getElementById('p-' + f).value; });

  const btn = document.getElementById('p-save-btn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ…';
  try {
    if (id) {
      await updatePersonnel(id, data, currentUser.uid);
    } else {
      await createPersonnel(data, currentUser.uid);
    }
    msg.textContent = '✅ تم الحفظ فعليًا في قاعدة البيانات.';
    msg.style.color = 'var(--green)';
    msg.style.display = 'block';
    await refreshPersonnelList();
    await refreshPersonnelCountStat();
    setTimeout(() => { formCard.style.display = 'none'; }, 800);
  } catch (err) {
    msg.textContent = '❌ فشل الحفظ: ' + (err.code || err.message);
    msg.style.color = 'var(--danger)';
    msg.style.display = 'block';
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ';
  }
});

// ---------- 7) قائمة المنتسبين + بحث فوري ----------
async function refreshPersonnelList() {
  const listEl = document.getElementById('personnel-list');
  listEl.textContent = 'جاري التحميل…';
  try {
    personnelCache = await listPersonnel();
    renderPersonnelList(personnelCache);
  } catch (err) {
    listEl.textContent = '❌ فشل تحميل المنتسبين: ' + (err.code || err.message);
    console.error(err);
  }
}

function renderPersonnelList(list) {
  const listEl = document.getElementById('personnel-list');
  if (list.length === 0) {
    listEl.innerHTML = '<p style="color:var(--text-muted); font-size:14px">لا يوجد منتسبون بعد.</p>';
    return;
  }
  listEl.innerHTML = '';
  list.forEach((p) => {
    const unitName = unitsCache.find((u) => u.id === p.unitId)?.name || '—';
    const canEdit = can(currentUser.profile, 'edit');
    const canDelete = can(currentUser.profile, 'delete');
    const div = document.createElement('div');
    div.className = 'p-card';
    div.innerHTML = `
      <p class="p-card-name">${esc(p.fullName)} ${p.rank ? '— ' + esc(p.rank) : ''}</p>
      <p class="p-card-meta">${esc(p.serviceNumber || '')} · ${esc(unitName)} · ${esc(p.position || '')}</p>
      <div class="p-card-actions">
        ${canEdit ? `<button data-action="edit" data-id="${p.id}">تعديل</button>` : ''}
        ${canDelete ? `<button data-action="delete" data-id="${p.id}" class="danger">حذف</button>` : ''}
      </div>
    `;
    listEl.appendChild(div);
  });

  listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => openEditForm(btn.dataset.id));
  });
  listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
}

function openEditForm(id) {
  const p = personnelCache.find((x) => x.id === id);
  if (!p) return;
  document.getElementById('p-id').value = p.id;
  pFields.forEach((f) => { document.getElementById('p-' + f).value = p[f] || ''; });
  formTitle.textContent = 'تعديل بيانات منتسب';
  formCard.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleDelete(id) {
  const p = personnelCache.find((x) => x.id === id);
  if (!confirm(`هل أنت متأكد من حذف "${p?.fullName}"؟ لا يمكن التراجع.`)) return;
  try {
    await deletePersonnel(id);
    await refreshPersonnelList();
    await refreshPersonnelCountStat();
  } catch (err) {
    alert('فشل الحذف: ' + (err.code || err.message));
    console.error(err);
  }
}

document.getElementById('p-search').addEventListener('input', (e) => {
  const term = e.target.value.trim().toLowerCase();
  if (!term) { renderPersonnelList(personnelCache); return; }
  const filtered = personnelCache.filter((p) =>
    (p.fullName || '').toLowerCase().includes(term) ||
    (p.serviceNumber || '').toLowerCase().includes(term) ||
    (p.rank || '').toLowerCase().includes(term)
  );
  renderPersonnelList(filtered);
});

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---------- 8) إدارة المستخدمين (من المرحلة 4، بدون تغيير منطقي) ----------
const uUid = document.getElementById('u-uid');
const uName = document.getElementById('u-name');
const uEmail = document.getElementById('u-email');
const uRole = document.getElementById('u-role');
const uActive = document.getElementById('u-active');
const uSaveBtn = document.getElementById('u-save-btn');
const uSaveMsg = document.getElementById('u-save-msg');
const usersList = document.getElementById('users-list');

Object.entries(ROLES).forEach(([key, label]) => {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = label;
  uRole.appendChild(opt);
});

async function refreshUsersList() {
  usersList.textContent = 'جاري التحميل…';
  try {
    const users = await listUsers();
    if (users.length === 0) { usersList.textContent = 'لا يوجد مستخدمون بعد.'; return; }
    usersList.innerHTML = '';
    users.forEach((u) => {
      const row = document.createElement('div');
      row.className = 'status-row';
      row.style.cursor = 'pointer';
      row.innerHTML = `<span class="dot ${u.active ? 'ok' : 'pending'}"></span><span>${esc(u.name || '(بلا اسم)')} — ${esc(ROLES[u.role] || u.role || '—')}</span>`;
      row.addEventListener('click', () => {
        uUid.value = u.uid; uName.value = u.name || ''; uEmail.value = u.email || '';
        uRole.value = u.role || 'viewer'; uActive.checked = !!u.active;
      });
      usersList.appendChild(row);
    });
  } catch (err) {
    usersList.textContent = '❌ فشل تحميل المستخدمين: ' + (err.code || err.message);
  }
}

uSaveBtn.addEventListener('click', async () => {
  uSaveMsg.style.display = 'none';
  const uid = uUid.value.trim();
  if (!uid) {
    uSaveMsg.textContent = 'أدخل الـ UID أولاً.';
    uSaveMsg.style.color = 'var(--danger)';
    uSaveMsg.style.display = 'block';
    return;
  }
  uSaveBtn.disabled = true;
  uSaveBtn.textContent = 'جاري الحفظ…';
  try {
    await upsertUserProfile(uid, {
      name: uName.value.trim(), email: uEmail.value.trim(),
      role: uRole.value, active: uActive.checked
    });
    uSaveMsg.textContent = '✅ تم الحفظ فعليًا في Firestore.';
    uSaveMsg.style.color = 'var(--green)';
    uSaveMsg.style.display = 'block';
    await refreshUsersList();
  } catch (err) {
    uSaveMsg.textContent = '❌ فشل الحفظ: ' + (err.code || err.message);
    uSaveMsg.style.color = 'var(--danger)';
    uSaveMsg.style.display = 'block';
  } finally {
    uSaveBtn.disabled = false;
    uSaveBtn.textContent = 'حفظ المستخدم';
  }
});
