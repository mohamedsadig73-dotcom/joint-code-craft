

## نظام تشخيص وإصلاح التحديثات للتطبيق المكتبي

سأبني نظاماً متكاملاً لتشخيص مشكلة فشل التحديث الحالية ومنعها مستقبلاً، عبر إضافة "سجل التحديث" داخل التطبيق، وتحسين منطق الاستبدال، وتسجيل الأخطاء في قاعدة البيانات.

---

### 1. سجل التحديث (Update Log) — قاعدة البيانات

جدول جديد `update_logs` لتتبع كل محاولة تحديث:
```text
- id, user_id, app_version, shell_version
- attempted_url (الرابط المستخدم)
- phase (check | download | extract | install | done | failed)
- status (success | error)
- error_message (نص الخطأ الكامل)
- platform (electron | web)
- created_at
```
- RLS: المستخدم يرى سجلاته فقط، الـ admin يرى كل السجلات.
- يُكتب في الجدول تلقائياً من `UpdateChecker` في كل مرحلة.

---

### 2. نافذة "سجل التحديث" داخل التطبيق

**صفحة جديدة** `/update-log` (مرتبطة من Profile + زر مساعدة في فقاعة التحديث):
- تعرض آخر 20 محاولة تحديث للمستخدم الحالي
- لكل محاولة: التاريخ، الإصدار المستهدف، الرابط، المرحلة التي فشلت، نص الخطأ
- زر "إعادة المحاولة الآن"
- زر "نسخ السجل" لإرساله للدعم
- معلومات النظام: الإصدار الحالي، نوع البيئة (Web / Desktop)، رابط `version.json`، رابط `desktop-release.json`

---

### 3. تحسين منطق `downloadUpdate` في Electron

تحديث `electron/main.cjs` لمعالجة مشاكل الاستبدال أثناء تشغيل التطبيق:

**أ. منع التعارض:**
- التحقق من عدم وجود عملية تحديث جارية (lock file: `update.lock`)
- إنشاء `update.lock` قبل البدء، حذفه عند الانتهاء أو الفشل

**ب. استبدال آمن (Atomic Replace):**
```text
1. تنزيل ZIP إلى userData/updates/staging/
2. استخراج إلى userData/updates/extracted/
3. التحقق من سلامة الملفات (وجود index.html + assets/)
4. نسخ النسخة الحالية إلى dist-backup/ (Rollback)
5. حذف dist/ القديم بشكل آمن (مع إعادة محاولة عند EBUSY)
6. نقل dist الجديد إلى مكانه
7. كتابة .version-marker لتأكيد نجاح الاستبدال
8. حذف update.lock
9. طلب إعادة التشغيل من المستخدم
```

**ج. معالجة EBUSY على Windows:**
- استخدام `fs.rmSync` مع `maxRetries: 5, retryDelay: 500`
- إذا فشل الحذف: حفظ النسخة الجديدة في `dist-pending/` وتطبيقها عند الإقلاع التالي قبل تحميل النافذة

**د. Rollback تلقائي:**
- إذا فشل أي شيء بعد البدء بالحذف → استعادة من `dist-backup/`
- إعلام المستخدم بالفشل والاستعادة الناجحة

---

### 4. التحقق من توافق إصدار الـ Shell

في `UpdateChecker.tsx` و `main.cjs`:

```text
desktop-release.json يحتوي:
- desktop_shell_version: "4.4.5"  (إصدار الويب الجديد)
- min_shell_version: "4.4.0"      (الحد الأدنى لـ Electron shell)
- web_version: "4.4.5"
```

- إذا كان `LOCAL_SHELL_VERSION < min_shell_version`:
  - عرض رسالة واضحة: **"يتطلب هذا التحديث تثبيت نسخة جديدة من التطبيق. الرجاء تنزيل المثبت الكامل."**
  - زر "تنزيل المثبت الكامل" يفتح رابط الإصدار الكامل
  - تعطيل التحديث التلقائي (Hot-Swap) في هذه الحالة
- يُسجَّل سبب الرفض في `update_logs`

---

### 5. إرسال سجلات الأخطاء (Error Telemetry)

**أ. عند فشل أي مرحلة:**
- يُرسل تلقائياً إلى جدول `update_logs` (Supabase) مع:
  - رسالة الخطأ
  - الرابط المستخدم
  - الإصدار الحالي + المستهدف
  - منصة التشغيل (Win32 / Web)
  - معرّف المستخدم

**ب. صفحة Admin جديدة** `/admin/update-diagnostics`:
- جدول بكل محاولات التحديث الفاشلة عبر النظام
- فلترة حسب الإصدار، التاريخ، نوع الخطأ
- تجميع الأخطاء المتكررة لتحديد الأنماط
- يساعدك في رؤية مشاكل المستخدمين الآخرين بدون الحاجة لسؤالهم

---

### 6. اختبار التحديث (Self-Test)

زر جديد في صفحة "سجل التحديث": **"اختبر الاتصال الآن"**
- يجلب `version.json` ويعرض النتيجة (✓ متاح / ✗ فشل + سبب)
- يجلب `desktop-release.json` ويعرض النتيجة
- يحاول تنزيل الـ ZIP كـ HEAD request للتحقق من إمكانية الوصول (بدون تنزيل فعلي)
- يعرض جميع الإصدارات: Local Web, Local Shell, Remote Web, Remote Shell
- يحدد بالضبط أين تكمن المشكلة

---

### الملفات المعدّلة/الجديدة

| الملف | الإجراء |
|---|---|
| `supabase/migrations/...sql` | إنشاء جدول `update_logs` + RLS |
| `electron/main.cjs` | تحسين `download-update` + lock + rollback + EBUSY handling |
| `electron/preload.cjs` | إضافة `getShellVersion`, `testUpdateChannel` |
| `public/desktop-release.json` | إضافة `min_shell_version` |
| `src/components/UpdateChecker.tsx` | تحقق shell version + كتابة logs |
| `src/pages/UpdateLog.tsx` | **جديد** — صفحة سجل التحديث |
| `src/pages/UpdateDiagnostics.tsx` | **جديد** — صفحة Admin للأخطاء |
| `src/hooks/useUpdateLogger.ts` | **جديد** — hook لكتابة السجلات |
| `src/App.tsx` | إضافة المسارات الجديدة |
| `src/components/Navigation.tsx` + `Profile.tsx` | رابط لصفحة سجل التحديث |
| `src/contexts/LanguageContext.tsx` | ترجمات جديدة (AR/EN) بدون أي نص hardcoded |

---

### ملاحظة مهمة حول الاختبار الفعلي

**لا أستطيع تشغيل اختبار تحديث على Windows من بيئة السحابة** — الـ Electron/التطبيق يعمل على جهازك أنت. لكن بعد التطبيق:

1. ستفتح التطبيق الحالي v4.4.3 على الويندوز
2. ستظهر فقاعة التحديث → اضغط "اختبر الاتصال الآن" (الزر الجديد)
3. ستحصل على تشخيص فوري لكل خطوة
4. كل محاولة فاشلة ستُسجَّل تلقائياً في قاعدة البيانات وأستطيع مراجعتها

**بعد الموافقة على هذه الخطة، سأنفذ التغييرات ثم أبني وأرفع نسخة Windows جديدة v4.4.6 تحتوي على كل التحسينات أعلاه.**

