// documents.js — بيانات الوثائق في Firestore (الملف الفعلي على Cloudinary، هنا فقط البيانات الوصفية)
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

export const DOC_TYPES = {
  order:        'أمر إداري',
  letter:       'كتاب',
  id_card:      'هوية',
  certificate:  'شهادة',
  course_cert:  'شهادة دورة',
  thanks_letter:'كتاب شكر',
  service_doc:  'مستند خدمة',
  other:        'وثيقة أخرى'
};

export async function listDocumentsForPerson(personnelId) {
  const q = query(collection(db, 'documents'), where('personnelId', '==', personnelId));
  const snap = await getDocs(q);
  const docsArr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docsArr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return docsArr;
}

export async function addDocumentRecord(data, uid) {
  return addDoc(collection(db, 'documents'), {
    ...data,
    uploadedAt: serverTimestamp(),
    uploadedBy: uid
  });
}

export async function deleteDocumentRecord(id) {
  return deleteDoc(doc(db, 'documents', id));
}
