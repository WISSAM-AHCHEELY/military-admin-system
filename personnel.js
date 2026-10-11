// personnel.js — إدارة المنتسبين: CRUD حقيقي عبر Firestore (لا بيانات ثابتة)
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export async function listPersonnel() {
  const q = query(collection(db, "personnel"), orderBy("fullName"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createPersonnel(data, uid) {
  return addDoc(collection(db, "personnel"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid
  });
}

export async function updatePersonnel(id, data, uid) {
  return updateDoc(doc(db, "personnel", id), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: uid
  });
}

export async function deletePersonnel(id) {
  return deleteDoc(doc(db, "personnel", id));
}
