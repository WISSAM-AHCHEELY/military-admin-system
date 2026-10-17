// app.js — المرحلة 6: سجل الخدمة (Timeline) + كل ما سبق (Auth, Personnel, Users)
import { login, logout, watchAuthState } from "./auth.js";
import { listUsers, upsertUserProfile } from "./users.js";
import { ROLES, can } from "./permissions.js";
import { listUnits, createUnit } from "./units.js";
import { listPersonnel, createPersonnel, updatePersonnel, deletePersonnel } from "./personnel.js";
import { EVENT_TYPES, listEventsForPerson, addServiceEvent, deleteServiceEvent } from "./serviceEvents.js";
import { LEAVE_TYPES, calcLeaveDays, isLeaveActiveToday, listLeavesForPerson, listAllLeaves, addLeave, deleteLeave } from "./leaves.js";
import { ATTENDANCE_STATUSES, setAttendance, listAttendanceForDate } from "./attendance.js";

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
let currentProfilePersonId = null;

// قائمة أنواع أحداث سجل الخدمة
const evTypeSelect = document.getElementById('ev-type');
Object.entries(EVENT_TYPES).forEach(([key, label]) => {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = label;
  evTypeSelect.appendChild(opt);
});

const lvTypeSelect = document.getElementById('lv-type');
Object.entries(LEAVE_TYPES).forEach(([key, label]) => {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = label;
  lvTypeSelect.appendChild(opt);
});

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
  attendance: document.getElementById('tab-attendance'),
  users: document.getElementById('tab-users')
};
function showTab(name) {
  Object.entries(tabs).forEach(([key, el]) => { el.style.display = key === name ? 'block' : 'none'; });
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === name));
  if (name === 'personnel') {
    document.getElementById('personnel-profile-card').style.display = 'none';
    document.getElementById('personnel-list-card').style.display = 'block';
    refreshPersonnelList();
  }
  if (name === 'users') refreshUsersList();
  if (name === 'attendance') loadAttendanceTab();
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
    await refreshLeavesStat();
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

// ---------- 4) الوحدات ----------
async function loadUnitsIntoSelect() {
  const sel = document.getElementById('p-unitId');
  try {
    unitsCache = await listUnits();
    sel.innerHTML = '<option value="">— بدون وحدة محددة —</option>';
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

// ---------- 5) إحصائية الرئيسية ----------
async function refreshPersonnelCountStat() {
  try {
    const list = await listPersonnel();
    personnelCache = list;
    statPersonnelCount.textContent = `عدد المنتسبين: ${list.length}`;
  } catch (err) {
    statPersonnelCount.textContent = 'تعذّر حساب عدد المنتسبين: ' + (err.code || err.message);
  }
}

const statLeavesActive = document.getElementById('stat-leaves-active');
async function refreshLeavesStat() {
  try {
    const all = await listAllLeaves();
    const activeCount = all.filter(isLeaveActiveToday).length;
    statLeavesActive.textContent = `عدد الإجازات الحالية: ${activeCount}`;
  } catch (err) {
    statLeavesActive.textContent = 'تعذّر حساب الإجازات الحالية: ' + (err.code || err.message);
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

// ---------- 7) قائمة المنتسبين + بحث ----------
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
        <button data-action="profile" data-id="${p.id}">فتح الملف</button>
        ${canEdit ? `<button data-action="edit" data-id="${p.id}">تعديل</button>` : ''}
        ${canDelete ? `<button data-action="delete" data-id="${p.id}" class="danger">حذف</button>` : ''}
      </div>
    `;
    listEl.appendChild(div);
  });

  listEl.querySelectorAll('[data-action="profile"]').forEach((btn) => {
    btn.addEventListener('click', () => openProfile(btn.dataset.id));
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

// ---------- 8) ملف خدمة المنتسب (بطاقة كاملة + Timeline) ----------
const FIELD_LABELS = {
  fullName: 'الاسم', motherName: 'اسم الأم', serviceNumber: 'الرقم الوظيفي',
  category: 'الفئة', rank: 'الرتبة', corps: 'الصنف', specialty: 'الاختصاص',
  position: 'المنصب', phone: 'الهاتف', birthDate: 'تاريخ الميلاد',
  birthPlace: 'محل الولادة', address: 'السكن', province: 'المحافظة',
  joinDate: 'تاريخ الالتحاق', status: 'الحالة', notes: 'ملاحظات'
};
const CATEGORY_LABELS = { officer: 'ضابط', rank: 'مرتبة', civilian: 'موظف مدني', contractor: 'متعاقد/متطوع' };
const STATUS_LABELS = { present: 'موجود', leave: 'إجازة', duty: 'واجب', course: 'دورة', hospital: 'مستشفى', absent: 'غياب' };

function openProfile(id) {
  const p = personnelCache.find((x) => x.id === id);
  if (!p) return;
  currentProfilePersonId = id;
  document.getElementById('personnel-list-card').style.display = 'none';
  formCard.style.display = 'none';
  document.getElementById('personnel-profile-card').style.display = 'block';

  const unitName = unitsCache.find((u) => u.id === p.unitId)?.name || '—';
  const infoEl = document.getElementById('p-profile-info');
  let rows = `<p style="font-size:20px; font-weight:700; margin:0 0 4px">${esc(p.fullName)}</p>
    <p style="color:var(--text-muted); margin:0 0 14px">${esc(CATEGORY_LABELS[p.category] || p.category || '')} — ${esc(unitName)}</p>`;
  Object.entries(FIELD_LABELS).forEach(([key, label]) => {
    if (key === 'fullName') return;
    let val = p[key] || '—';
    if (key === 'status') val = STATUS_LABELS[val] || val;
    if (key === 'category') val = CATEGORY_LABELS[val] || val;
    rows += `<div class="status-row"><span style="color:var(--text-muted); min-width:110px">${label}</span><span>${esc(val)}</span></div>`;
  });
  infoEl.innerHTML = rows;

  // إخفاء نموذج إضافة الحدث عن أي دور لا يملك صلاحية create فعليًا
  // (تحسين تجربة استخدام فقط — الفرض الحقيقي يبقى في firestore.rules)
  document.getElementById('p-profile-add-event').style.display =
    can(currentUser.profile, 'create') ? 'flex' : 'none';
  document.getElementById('p-profile-add-leave').style.display =
    can(currentUser.profile, 'create') ? 'flex' : 'none';

  loadTimeline(id);
  loadLeaves(id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('p-profile-back-btn').addEventListener('click', () => {
  document.getElementById('personnel-profile-card').style.display = 'none';
  document.getElementById('personnel-list-card').style.display = 'block';
  currentProfilePersonId = null;
});

async function loadTimeline(personId) {
  const tlEl = document.getElementById('p-profile-timeline');
  tlEl.textContent = 'جاري التحميل…';
  try {
    const events = await listEventsForPerson(personId);
    if (events.length === 0) {
      tlEl.innerHTML = '<p style="color:var(--text-muted); font-size:14px">لا يوجد أحداث مسجّلة بعد.</p>';
      return;
    }
    const canDelete = can(currentUser.profile, 'delete');
    tlEl.innerHTML = '';
    events.forEach((ev) => {
      const row = document.createElement('div');
      row.className = 'status-row';
      row.innerHTML = `
        <span class="dot ok"></span>
        <span style="flex:1">
          <strong>${esc(ev.date || '')}</strong> — ${esc(EVENT_TYPES[ev.type] || ev.type)}
          ${ev.title ? ': ' + esc(ev.title) : ''}
          ${ev.orderNumber ? ' (أمر رقم ' + esc(ev.orderNumber) + ')' : ''}
        </span>
        ${canDelete ? `<button data-ev-id="${ev.id}" style="font-size:12px; padding:4px 8px; border:1px solid var(--danger); color:var(--danger); background:transparent; border-radius:6px">حذف</button>` : ''}
      `;
      tlEl.appendChild(row);
    });
    tlEl.querySelectorAll('[data-ev-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('حذف هذا الحدث من السجل؟')) return;
        await deleteServiceEvent(btn.dataset.evId);
        loadTimeline(personId);
      });
    });
  } catch (err) {
    tlEl.textContent = '❌ فشل تحميل السجل: ' + (err.code || err.message);
    console.error(err);
  }
}

// ---------- الإجازات ----------
function updateDaysPreview() {
  const s = document.getElementById('lv-start').value;
  const e = document.getElementById('lv-end').value;
  const el = document.getElementById('lv-days-preview');
  if (!s || !e) { el.textContent = 'عدد الأيام: —'; return; }
  const days = calcLeaveDays(s, e);
  el.textContent = days > 0 ? `عدد الأيام: ${days}` : 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية';
}
document.getElementById('lv-start').addEventListener('change', updateDaysPreview);
document.getElementById('lv-end').addEventListener('change', updateDaysPreview);

async function loadLeaves(personId) {
  const el = document.getElementById('p-profile-leaves');
  el.textContent = 'جاري التحميل…';
  try {
    const leaves = await listLeavesForPerson(personId);
    if (leaves.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted); font-size:14px">لا يوجد إجازات مسجّلة بعد.</p>';
      return;
    }
    const canDelete = can(currentUser.profile, 'delete');
    const today = new Date().toISOString().slice(0, 10);
    el.innerHTML = '';
    leaves.forEach((lv) => {
      const status = lv.endDate < today ? 'منتهية' : (lv.startDate > today ? 'قادمة' : 'حالية الآن');
      const dotClass = status === 'حالية الآن' ? 'ok' : 'pending';
      const row = document.createElement('div');
      row.className = 'status-row';
      row.innerHTML = `
        <span class="dot ${dotClass}"></span>
        <span style="flex:1">
          <strong>${esc(LEAVE_TYPES[lv.type] || lv.type)}</strong> — ${esc(lv.startDate)} إلى ${esc(lv.endDate)}
          (${lv.days} يوم) · ${status}
          ${lv.orderNumber ? ' · أمر رقم ' + esc(lv.orderNumber) : ''}
        </span>
        ${canDelete ? `<button data-lv-id="${lv.id}" style="font-size:12px; padding:4px 8px; border:1px solid var(--danger); color:var(--danger); background:transparent; border-radius:6px">حذف</button>` : ''}
      `;
      el.appendChild(row);
    });
    el.querySelectorAll('[data-lv-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('حذف هذه الإجازة من السجل؟')) return;
        await deleteLeave(btn.dataset.lvId);
        loadLeaves(personId);
        refreshLeavesStat();
      });
    });
  } catch (err) {
    el.textContent = '❌ فشل تحميل الإجازات: ' + (err.code || err.message);
    console.error(err);
  }
}

document.getElementById('lv-save-btn').addEventListener('click', async () => {
  const msg = document.getElementById('lv-save-msg');
  msg.style.display = 'none';
  const startDate = document.getElementById('lv-start').value;
  const endDate = document.getElementById('lv-end').value;
  if (!startDate || !endDate || !currentProfilePersonId) {
    msg.textContent = 'أدخل تاريخ البداية والنهاية.';
    msg.style.color = 'var(--danger)';
    msg.style.display = 'block';
    return;
  }
  const days = calcLeaveDays(startDate, endDate);
  if (days <= 0) {
    msg.textContent = 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية أو يساويه.';
    msg.style.color = 'var(--danger)';
    msg.style.display = 'block';
    return;
  }
  const btn = document.getElementById('lv-save-btn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ…';
  try {
    const leaveData = {
      personnelId: currentProfilePersonId,
      type: document.getElementById('lv-type').value,
      startDate,
      endDate,
      orderNumber: document.getElementById('lv-orderNumber').value.trim(),
      issuer: document.getElementById('lv-issuer').value.trim()
    };
    await addLeave(leaveData, currentUser.uid);

    // ربط حالة المنتسب فعليًا: إذا كانت الإجازة فعّالة اليوم، تُحدَّث حالته تلقائيًا
    // (شرط إلزامي: الحالة يجب أن تعتمد على بيانات حقيقية، لا تبقى منفصلة عن الإجازات)
    if (isLeaveActiveToday(leaveData)) {
      await updatePersonnel(currentProfilePersonId, { status: 'leave' }, currentUser.uid);
      const p = personnelCache.find((x) => x.id === currentProfilePersonId);
      if (p) p.status = 'leave';
    }

    msg.textContent = '✅ تم تسجيل الإجازة فعليًا.';
    msg.style.color = 'var(--green)';
    msg.style.display = 'block';
    document.getElementById('lv-start').value = '';
    document.getElementById('lv-end').value = '';
    document.getElementById('lv-orderNumber').value = '';
    document.getElementById('lv-issuer').value = '';
    updateDaysPreview();
    loadLeaves(currentProfilePersonId);
    refreshLeavesStat();
  } catch (err) {
    msg.textContent = '❌ فشل الحفظ: ' + (err.code || err.message);
    msg.style.color = 'var(--danger)';
    msg.style.display = 'block';
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'تسجيل الإجازة';
  }
});

document.getElementById('ev-save-btn').addEventListener('click', async () => {
  const msg = document.getElementById('ev-save-msg');
  msg.style.display = 'none';
  const date = document.getElementById('ev-date').value;
  if (!date || !currentProfilePersonId) {
    msg.textContent = 'اختر التاريخ أولاً.';
    msg.style.color = 'var(--danger)';
    msg.style.display = 'block';
    return;
  }
  const btn = document.getElementById('ev-save-btn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ…';
  try {
    await addServiceEvent({
      personnelId: currentProfilePersonId,
      type: document.getElementById('ev-type').value,
      date,
      title: document.getElementById('ev-title').value.trim(),
      orderNumber: document.getElementById('ev-orderNumber').value.trim()
    }, currentUser.uid);
    msg.textContent = '✅ أُضيف الحدث فعليًا للسجل.';
    msg.style.color = 'var(--green)';
    msg.style.display = 'block';
    document.getElementById('ev-date').value = '';
    document.getElementById('ev-title').value = '';
    document.getElementById('ev-orderNumber').value = '';
    loadTimeline(currentProfilePersonId);
  } catch (err) {
    msg.textContent = '❌ فشل الحفظ: ' + (err.code || err.message);
    msg.style.color = 'var(--danger)';
    msg.style.display = 'block';
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'إضافة حدث للسجل';
  }
});

// ---------- الحضور اليومي ----------
const attDateInput = document.getElementById('att-date');
attDateInput.value = new Date().toISOString().slice(0, 10);
attDateInput.addEventListener('change', loadAttendanceTab);

async function loadAttendanceTab() {
  const date = attDateInput.value;
  const listEl = document.getElementById('attendance-list');
  const summaryEl = document.getElementById('att-summary');
  listEl.textContent = 'جاري التحميل…';
  try {
    if (personnelCache.length === 0) personnelCache = await listPersonnel();
    const records = await listAttendanceForDate(date);
    const canEdit = can(currentUser.profile, 'create') || can(currentUser.profile, 'edit');

    renderAttendanceSummary(records, summaryEl);

    if (personnelCache.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted); font-size:14px">لا يوجد منتسبون بعد.</p>';
      return;
    }
    listEl.innerHTML = '';
    personnelCache.forEach((p) => {
      const current = records[p.id]?.status || p.status || 'present';
      const row = document.createElement('div');
      row.className = 'status-row';
      if (canEdit) {
        const selHtml = Object.entries(ATTENDANCE_STATUSES)
          .map(([k, label]) => `<option value="${k}" ${k === current ? 'selected' : ''}>${label}</option>`)
          .join('');
        row.innerHTML = `
          <span style="flex:1">${esc(p.fullName)} ${p.rank ? '— ' + esc(p.rank) : ''}</span>
          <select data-att-person="${p.id}" style="width:auto; min-width:120px">${selHtml}</select>
        `;
      } else {
        row.innerHTML = `
          <span class="dot ok"></span>
          <span>${esc(p.fullName)} — ${esc(ATTENDANCE_STATUSES[current] || current)}</span>
        `;
      }
      listEl.appendChild(row);
    });

    if (canEdit) {
      listEl.querySelectorAll('[data-att-person]').forEach((sel) => {
        sel.addEventListener('change', async () => {
          const personId = sel.dataset.attPerson;
          sel.disabled = true;
          try {
            await setAttendance(personId, date, sel.value, currentUser.uid);
            // ربط الحالة الحالية بالمنتسب فقط إذا كان التاريخ هو اليوم (نفس منطق الإجازات)
            const todayStr = new Date().toISOString().slice(0, 10);
            if (date === todayStr) {
              await updatePersonnel(personId, { status: sel.value }, currentUser.uid);
              const p = personnelCache.find((x) => x.id === personId);
              if (p) p.status = sel.value;
            }
            const updated = await listAttendanceForDate(date);
            renderAttendanceSummary(updated, summaryEl);
          } catch (err) {
            alert('فشل حفظ الحضور: ' + (err.code || err.message));
            console.error(err);
          } finally {
            sel.disabled = false;
          }
        });
      });
    }
  } catch (err) {
    listEl.textContent = '❌ فشل تحميل الحضور: ' + (err.code || err.message);
    console.error(err);
  }
}

function renderAttendanceSummary(records, el) {
  const counts = {};
  Object.values(records).forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const parts = Object.entries(counts).map(([k, n]) => `${ATTENDANCE_STATUSES[k] || k}: ${n}`);
  el.textContent = parts.length ? parts.join(' · ') : 'لا توجد سجلات حضور مسجّلة لهذا اليوم بعد.';
}

// ---------- 9) إدارة المستخدمين ----------
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
