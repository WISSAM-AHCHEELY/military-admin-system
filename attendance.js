// attendance.js — الحضور اليومي: تسجيل حالة كل منتسب لتاريخ محدد
// معرّف المستند حتمي (personnelId_date) حتى يكون "تسجيل" و"تعديل" نفس العملية (Upsert حقيقي بلا تكرار)
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export const ATTENDANCE_STATUSES = {
  present:   'موجود',
  leave:     'إجازة',
  duty:      'واجب',
  seconded:  'منسّب',
  course:    'دورة',
  hospital:  'مستشفى',
  absent:    'غياب',
  admin_task:'مهمة إدارية',
  other:     'أخرى'
};

function docId(personnelId, date) {
  return `${personnelId}_${date}`;
}

export async function setAttendance(personnelId, date, status, uid) {
  const ref = doc(db, 'attendance', docId(personnelId, date));
  return setDoc(ref, {
    personnelId,
    date,
    status,
    recordedBy: uid,
    recordedAt: serverTimestamp()
  });
}

export async function getAttendanceRecord(personnelId, date) {
  const snap = await getDoc(doc(db, 'attendance', docId(personnelId, date)));
  return snap.exists() ? snap.data() : null;
}

// كل سجلات الحضور ليوم محدد (لتعبئة قائمة الموجودين دفعة واحدة بدل استعلام لكل شخص)
export async function listAttendanceForDate(date) {
  const q = query(collection(db, 'attendance'), where('date', '==', date));
  const snap = await getDocs(q);
  const map = {};
  snap.forEach((d) => { map[d.data().personnelId] = d.data(); });
  return map;
}
