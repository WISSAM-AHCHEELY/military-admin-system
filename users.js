// users.js — إدارة ملفات تعريف المستخدمين في Firestore (users/{uid})
// تنبيه مهم: هذا لا ينشئ حساب دخول (Firebase Authentication) جديداً —
// إنشاء حساب الدخول نفسه يبقى يدوياً من Firebase Console (راجع التعليمات)،
// لأن ذلك يتطلب Admin SDK غير متاح من المتصفح بدون Cloud Functions (خطة مدفوعة).
// هذا الملف يدير فقط "ملف الصلاحيات" للمستخدمين الذين أُنشئت حساباتهم مسبقاً.
import {
  collection,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export async function listUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function upsertUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}
