// units.js — قائمة الوحدات (من قاعدة البيانات، وليست مكتوبة داخل الكود — بند 17 من المتطلبات)
// ملاحظة: هذه نسخة مبسّطة (قائمة مسطّحة) للمرحلة 5. الهيكل الهرمي الكامل
// (فرقة ← لواء ← فوج ← سرية ← فصيل) يُبنى في مرحلة "إدارة الوحدات" المخصصة لاحقاً.
import {
  collection,
  getDocs,
  addDoc,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export async function listUnits() {
  const q = query(collection(db, "units"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createUnit(name) {
  return addDoc(collection(db, "units"), { name: name.trim() });
}
