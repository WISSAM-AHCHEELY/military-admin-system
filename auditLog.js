// auditLog.js — سجل العمليات الحساسة: من فعل ماذا، متى، على أي سجل
// سجل غير قابل للتعديل أو الحذف من أي أحد (مفروض في firestore.rules) — append-only حقيقي
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export const AUDIT_ACTION_LABELS = {
  CREATE: 'إنشاء', UPDATE: 'تعديل', DELETE: 'حذف',
  LOGIN: 'تسجيل دخول', LOGOUT: 'تسجيل خروج', UPLOAD: 'رفع ملف'
};

// لا تنتظر الواجهة نتيجة التسجيل (fire-and-forget) حتى لا يبطئ أي عملية أساسية،
// لكن أي فشل يُسجَّل في console للتشخيص ولا يُخفى صامتًا
export function logAction({ userId, userName, action, targetType, targetId, details }) {
  addDoc(collection(db, 'auditLog'), {
    userId: userId || null,
    userName: userName || '',
    action,
    targetType: targetType || '',
    targetId: targetId || '',
    details: details || '',
    timestamp: serverTimestamp()
  }).catch((err) => console.error('[auditLog] فشل تسجيل العملية:', err));
}

export async function listRecentAuditLog(count = 50) {
  const q = query(collection(db, 'auditLog'), orderBy('timestamp', 'desc'), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
