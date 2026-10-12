// serviceEvents.js — سجل خدمة المنتسب (Timeline): تعيين/ترقية/نقل/دورة/منصب/أخرى
// كل حدث مرتبط بـ personnelId، ويُقرأ مرتباً تنازلياً بالتاريخ لبناء الخط الزمني
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

export const EVENT_TYPES = {
  appointment: 'تعيين',
  promotion:   'ترقية',
  transfer:    'نقل',
  course:      'دورة',
  position:    'منصب جديد',
  other:       'أخرى'
};

export async function listEventsForPerson(personnelId) {
  // ملاحظة: بدون orderBy هنا عمداً لتفادي الحاجة لفهرس مركّب في هذه المرحلة؛
  // الترتيب يتم في الواجهة بعد الجلب (عدد الأحداث لكل منتسب صغير، فهذا مقبول أداءً)
  const q = query(collection(db, 'serviceEvents'), where('personnelId', '==', personnelId));
  const snap = await getDocs(q);
  const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  events.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return events;
}

export async function addServiceEvent(data, uid) {
  return addDoc(collection(db, 'serviceEvents'), {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: uid
  });
}

export async function deleteServiceEvent(id) {
  return deleteDoc(doc(db, 'serviceEvents', id));
}
