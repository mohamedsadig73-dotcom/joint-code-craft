

# خطة: بناء نسخة ويندوز v5 + إصلاح الإشعارات + التحديث التلقائي

## المشكلة الحالية

خطأ `Maximum update depth exceeded` لا يزال موجوداً في `NotificationCenter` رغم التعديل السابق. السبب: استخدام `DropdownMenu` في وضع **controlled** (`open={isOpen}`) يتسبب في حلقة render مع Radix UI.

---

## الخطوة 1: إصلاح NotificationCenter نهائياً

**المشكلة**: Radix `DropdownMenu` في الوضع المتحكم (controlled) يعيد استدعاء `onOpenChange` بشكل متكرر مما يسبب حلقة لا نهائية.

**الحل**: التحويل إلى وضع **غير متحكم** (uncontrolled) مع استخدام `ref` لتتبع حالة الفتح بدلاً من `useState`:

- إزالة `open={isOpen}` من `DropdownMenu`
- استخدام `onOpenChange` فقط لتفعيل التحميل الكسول (lazy-load) وتتبع الحالة عبر `ref`
- إبقاء `useMemo` و `useCallback` الحالية

**الملف**: `src/components/NotificationCenter.tsx`

---

## الخطوة 2: تحديث Electron للتحميل المحلي أولاً + تحديث تلقائي

**المشكلة**: `electron/main.cjs` الحالي لا يزال يحاول التحميل من الرابط الخارجي أولاً (الذي قد لا يعمل)، مما يسبب تجمّد.

**التعديلات**:

### electron/main.cjs
- تحميل `dist/index.html` المحلي مباشرةً (بدون محاولة الرابط الخارجي)
- إضافة دعم **تحديث تلقائي صامت**: عند اكتشاف نسخة أحدث عبر `desktop-release.json`، يتم تحميل الـ ZIP تلقائياً في الخلفية ثم إشعار المستخدم بإعادة التشغيل
- إضافة `ipcMain` handler لتنزيل التحديث

### electron/preload.cjs
- إضافة `downloadUpdate(url)` — تنزيل الملف مع إرسال نسبة التقدم
- إضافة `onDownloadProgress(callback)` — استقبال نسبة التحميل
- إضافة `restartApp()` — إعادة تشغيل التطبيق بعد التحديث

### src/components/UpdateChecker.tsx
- في وضع Electron: عرض شريط تقدم التحميل بدلاً من فتح المتصفح
- بعد اكتمال التحميل: زر "إعادة التشغيل للتحديث"
- التحديث الإجباري (`mandatory: true`): بدء التحميل تلقائياً

### src/vite-env.d.ts
- تحديث تعريف `electronAPI` بالوظائف الجديدة

---

## الخطوة 3: رفع النسخة وتحديث الإصدار

### vite.config.ts
- رفع `APP_VERSION` إلى `'4.4.0'`

### public/desktop-release.json
- تحديث `desktop_shell_version` إلى `4.4.0`
- تحديث `download_url` للإشارة إلى `v5.zip`

### بناء ورفع نسخة ويندوز
1. `vite build` لإنشاء `dist/`
2. `@electron/packager` لتجميع نسخة Windows x64
3. ضغط الملف كـ ZIP
4. رفع إلى Supabase Storage bucket `desktop-releases`
5. تحديث `desktop-release.json`

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/components/NotificationCenter.tsx` | إصلاح حلقة render — تحويل لوضع uncontrolled |
| `electron/main.cjs` | تحميل محلي مباشر + دعم تنزيل التحديثات |
| `electron/preload.cjs` | إضافة downloadUpdate, onDownloadProgress, restartApp |
| `src/components/UpdateChecker.tsx` | شريط تقدم + تحديث تلقائي في Electron |
| `src/vite-env.d.ts` | تعريفات TypeScript للوظائف الجديدة |
| `vite.config.ts` | رفع النسخة إلى 4.4.0 |
| `public/desktop-release.json` | تحديث معلومات الإصدار v5 |

