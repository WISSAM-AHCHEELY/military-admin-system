// firebase-config.js — الاتصال الحقيقي بمشروع Firebase (بدون npm، عبر CDN مباشرة)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// بيانات مشروعك الحقيقية (هذه القيم مصمَّمة لتكون مرئية في كود الواجهة —
// هذا طبيعي وآمن في Firebase، الحماية الحقيقية تكون في Firestore/Storage Rules)
const firebaseConfig = {
  apiKey: "AIzaSyC1MK2GMFALuhuUlKhNr8YrSNu_6Yl1Y2s",
  authDomain: "military-admin-system.firebaseapp.com",
  projectId: "military-admin-system",
  storageBucket: "military-admin-system.firebasestorage.app",
  messagingSenderId: "757663326319",
  appId: "1:757663326319:web:b6383f5239bd31d4c76d9a"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
