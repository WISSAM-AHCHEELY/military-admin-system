// leaves.js — إدارة الإجازات: CRUD حقيقي + حساب الأيام تلقائيًا
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export const LEAVE_TYPES = {
  regular:   'اعتيادية',
  sick:      'مرضية',
  marriage:  'زواج',
  death:     'وفاة',
  emergency: 'طارئة',
  study:     'دراسية',
  other:     'أخرى'
};

// عدد الأيام شاملاً يوم البداية والنهاية (حساب تلقائي حقيقي، وليس إدخالاً يدويًا)
export function calcLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  if (isNaN(diffMs) || diffMs < 0) return 0;
  return Math.floor(diffMs / 86400000) + 1;
}

export function isLeaveActiveToday(leave) {
  const today = new Date().toISOString().slice(0, 10);
  return leave.startDate <= today && leave.endDate >= today;
}

export async function listLeavesForPerson(personnelId) {
  const q = query(collection(db, 'leaves'), where('personnelId', '==', personnelId));
  const snap = await getDocs(q);
  const leaves = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  leaves.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  return leaves;
}

// لتقارير/إحصائيات لاحقة (عدد الإجازات الحالية إجمالاً) — بدون orderBy لتفادي فهرس مركّب
export async function listAllLeaves() {
  const snap = await getDocs(collection(db, 'leaves'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addLeave(data, uid) {
  const days = calcLeaveDays(data.startDate, data.endDate);
  return addDoc(collection(db, 'leaves'), {
    ...data,
    days,
    createdAt: serverTimestamp(),
    createdBy: uid
  });
}

export async function deleteLeave(id) {
  return deleteDoc(doc(db, 'leaves', id));
}
