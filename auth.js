// auth.js — تسجيل دخول/خروج حقيقي عبر Firebase Authentication
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// تسجيل الدخول — يرمي خطأ حقيقي من Firebase إذا كانت البيانات خاطئة
// (auth/invalid-credential, auth/user-disabled, auth/too-many-requests ...)
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

// يراقب حالة الدخول باستمرار، ويجلب ملف المستخدم من Firestore (users/{uid}) عند الدخول
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    let profile = null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      profile = snap.exists() ? snap.data() : null;
    } catch (err) {
      console.error("[auth] فشل جلب ملف المستخدم من Firestore:", err);
    }
    callback({ uid: user.uid, email: user.email, profile });
  });
}
