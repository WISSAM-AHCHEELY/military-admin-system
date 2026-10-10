# BUILD_STATUS.md

## Phase 0 — التحليل والمعمارية — Completed
- تحليل الفيديو المرفق (استخراج وفحص الإطارات فعليًا): 3 شاشات مرجعية (رئيسية بـ3 بطاقات، بطاقة خدمة المنتسب، نافذة إدخال بيانات).
- المعمارية المعتمدة: Vanilla JS (ES Modules, بدون Build) + Firebase (Auth + Firestore + Storage عبر CDN) + PWA + Netlify (نشر تلقائي من GitHub) + RTL + Mobile First.
- قيد إلزامي معتمد: لا Node/npm/Vite/TypeScript محلي — كل التطوير من هاتف Android فقط.
- **لم يتم اختباره فعليًا:** لا ينطبق (مرحلة تحليل فقط، لا كود تنفيذي).

## Phase 1 — تأسيس المشروع + اختبار حلقة النشر — Completed ✅
**الهدف:** التأكد عمليًا أن حلقة Acode ← GitHub ← النشر ← تثبيت على الهاتف تعمل، قبل بناء أي وظيفة إدارية حقيقية.

**تعديل معماري أثناء التنفيذ:** Netlify استُبدلت بـ **GitHub Pages** (حساب Netlify السابق لـ Wissam كان مستنفَد الحدود المجانية من مشروع أچيلي). الرابط الفعلي الحي:
`https://wissam-ahcheely.github.io/military-admin-system/`

**الملفات المُنشأة في هذه الدفعة:**
- index.html — صفحة اختبار تعرض حالة Service Worker وزر تثبيت PWA
- style.css — رموز التصميم (navy/gold/gray)، RTL، دعم الوضع الليلي
- app.js — تسجيل Service Worker + منطق beforeinstallprompt
- sw.js — استراتيجية Network First للصفحات، Cache First للملفات الثابتة، تنظيف نسخ قديمة تلقائيًا
- manifest.json — اسم عربي، أيقونات، standalone, RTL
- icon-192.png, icon-512.png — أيقونات مؤقتة في جذر المشروع مباشرة، بلا مجلد فرعي (شعار بديل مؤقت وليس الرسمي؛ وُضعت في الجذر عمدًا لأن منتقي الملفات على أندرويد لا يحافظ على بنية المجلدات عند الرفع الجماعي إلى GitHub)
- netlify.toml — نشر بدون Build، رؤوس Cache-Control تمنع بقاء نسخة قديمة

**قاعدة البيانات في هذه المرحلة:** لا يوجد — Firebase لم يُربط بعد عمدًا (هذا اختبار بنية تحتية فقط).

**الصلاحيات في هذه المرحلة:** لا ينطبق — لا يوجد Auth بعد.

**الأخطاء التي ظهرت فعليًا أثناء التنفيذ، وكيف أُصلحت:**
1. Netlify رفض الربط (بريد مستخدم سابقًا + حدود مجانية مستنفدة) → استُبدلت المنصة بالكامل بـ GitHub Pages.
2. GitHub Pages رفض التفعيل على مستودع Private ("Upgrade or make this repository public") → غُيّرت رؤية المستودع إلى Public من Settings ← Danger Zone (لا بديل مجاني آخر؛ هذا لا يكشف بيانات لأنه لا توجد بيانات بعد، الحماية الحقيقية لاحقًا في Firestore Rules).
3. فتح جذر الدومين `wissam-ahcheely.github.io` مباشرة أعطى 404 لأنه ليس مسار مشروعنا → الرابط الصحيح هو المسار الفرعي `/military-admin-system/`.
4. رفع الملفات تسبب بتكرار أسماء (`index-1.html`, `style-1.css` بدل `index.html`, `style.css`) بسبب رفع جزئي سابق لم يُكتشف → أُعيدت التسمية يدويًا عبر زر التحرير ✎ في GitHub.
5. `manifest.json` كانت تحتوي مسارات مطلقة (`/index.html`, `/`) تكسر العمل تحت مسار GitHub Pages الفرعي → صُححت إلى مسارات نسبية (`./`).

**نتيجة الاختبار الفعلي (موثّقة بلقطات شاشة من Wissam، وليست ادّعاءً):**
1. ✅ الصفحة تُحمَّل عبر HTTPS من `https://wissam-ahcheely.github.io/military-admin-system/`.
2. ✅ Service Worker مسجَّل بنجاح (نقطة خضراء).
3. ✅ RTL والخط العربي يعملان بصريًا.
4. ✅ زر "تثبيت التطبيق الآن" ظهر مفعّلاً (`beforeinstallprompt` اشتغل) وأدى الضغط عليه لتثبيت فعلي.
5. ✅ الأيقونة تعمل كتطبيق مستقل منفصل عن تبويبات Chrome (مؤكّد من لقطة قائمة التطبيقات المفتوحة في الهاتف).
6. ⏳ لم يُختبر بعد: فتح التطبيق بدون إنترنت (استراتيجية الكاش Network First/Cache First في sw.js).
7. 🟡 Firebase: لم يُربط بعد عمدًا (مخطَّط للمرحلة 2).

**الحالة:** ✅ المرحلة 1 مكتملة ومُتحقَّق منها فعليًا على جهاز Wissam.

## Phase 2 — اتصال Firebase حقيقي (Auth أولي + Firestore + Rules) — In Progress
**الهدف:** تسجيل دخول حقيقي عبر Firebase Authentication، وكتابة/قراءة حقيقيتان في Firestore تحت قواعد أمان Deny-by-default، كإثبات اتصال فعلي قبل بناء وحدات العمل (المنتسبين، الإجازات...).

**مشروع Firebase الفعلي:** `military-admin-system` (projectId)، Auth(Email/Password) وFirestore وStorage مفعّلة من طرف Wissam عبر Firebase Console من الهاتف.

**الملفات الجديدة/المحدَّثة في هذه الدفعة:**
- firebase-config.js — اتصال حقيقي عبر CDN (ES Modules)، لا npm
- auth.js — login/logout/watchAuthState حقيقية عبر Firebase Authentication
- db.js — testConnection() تكتب مستنداً حقيقياً في `_connectionTest/{uid}` وتقرأه
- firestore.rules — Deny-by-default؛ يسمح فقط لمستخدم نشط (`users/{uid}.active == true`) بالوصول لمستند اختباره الخاص؛ كل شيء آخر مرفوض عمداً
- index.html / app.js — نموذج دخول حقيقي + زر اختبار اتصال حقيقي بالنتيجة الخام من Firestore على الشاشة
- sw.js — رُفع لإصدار v2 (ملفات جديدة في الكاش)، واستُثنيت طلبات Firebase من اعتراض Service Worker (بيانات حيّة لا تُخزَّن مؤقتاً)

**الصلاحيات في هذه المرحلة:** الحد الأدنى فقط — مستخدم نشط يرى بيانات نفسه حصراً. مصفوفة الأدوار الكاملة (Super Admin/مدير الوحدة/مشاهد...) غير مبنية بعد؛ تُبنى في مرحلة "المستخدمون والصلاحيات" القادمة.

**اختبارات مطلوبة من Wissam قبل اعتبار المرحلة مكتملة (لم تُنفَّذ مني — لا اتصال شبكة في بيئتي):**
1. إنشاء أول مستخدم في Firebase Console ← Authentication ← Add user.
2. إنشاء مستند مطابق يدوياً في Firestore تحت `users/{uid}` بالحقلين `role: "super_admin"` و`active: true`.
3. لصق محتوى firestore.rules في Firestore ← Rules ← Publish.
4. رفع الملفات السبعة المحدَّثة إلى GitHub (استبدال/إضافة).
5. تسجيل الدخول فعلياً من الواجهة بالحساب المُنشأ.
6. الضغط على "اختبار الاتصال الحقيقي بقاعدة البيانات" والتأكد من ظهور بيانات JSON حقيقية مسترجعة من Firestore.
7. اختبار سلبي (Negative Test) حقيقي: محاولة الدخول ببيانات خاطئة ← يجب ظهور رسالة خطأ Firebase حقيقية، لا رسالة نجاح مزيّفة.

**نتيجة الاختبار:** ⏳ بانتظار تنفيذ Wissam للخطوات أعلاه.
