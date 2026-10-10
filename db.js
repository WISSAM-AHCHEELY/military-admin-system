// db.js — عمليات Firestore الحقيقية (هذه المرحلة: اختبار اتصال فقط)
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// يكتب مستنداً حقيقياً في Firestore تحت _connectionTest/{uid}، ثم يقرأه مرة أخرى.
// إذا نجحت العمليتان، الاتصال بقاعدة البيانات حقيقي وفعّال — وليس افتراضاً.
export async function testConnection(uid) {
  const ref = doc(db, "_connectionTest", uid);
  await setDoc(ref, {
    pingAt: serverTimestamp(),
    phase: "Phase 2 — اختبار اتصال Firestore"
  });
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("تمت الكتابة لكن القراءة فشلت — راجع Firestore Rules");
  }
  return snap.data();
}
