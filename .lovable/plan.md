## المشكلة الجذرية

تحديث إصدار سطح المكتب يتطلب حالياً تعديل **5 ملفات يدوياً** وتنفيذ **3 خطوات منفصلة**:

```
package.json  →  vite.config.ts  →  desktop-release.json  →  public/desktop-release.json  →  public/version.json
                                              ↓
                              بناء  ZIP  →  رفع ZIP إلى Storage  →  رفع desktop-release.json إلى Storage
```

ما حدث: تم تحديث الكود محلياً إلى v4.4.8، ورفع ملف `DTS-Store-v4.4.8-dist.zip`، **لكن ملف `desktop-release.json` على Storage بقي يشير إلى v4.4.7** — لأن الرفع يدوي ولا يوجد تحقق بعد الرفع.

## الحل الجذري — 3 طبقات حماية

### الطبقة 1: مصدر واحد للحقيقة (Single Source of Truth)

- `package.json`'s `version` يصبح **المصدر الوحيد** للإصدار.
- `vite.config.ts` يقرأ `APP_VERSION` من `package.json` مباشرة (لا يكرره يدوياً).
- ملفات `desktop-release.json` و `version.json` تُولَّد **آلياً** عند `vite build` ولا تُعدَّل يدوياً أبداً.

### الطبقة 2: سكربت إصدار موحّد `scripts/release-desktop.mjs`

أمر واحد ينفذ كل شيء بترتيب صحيح:

```bash
npm run release:desktop -- 4.4.9 "ملاحظات الإصدار"
```

السكربت يقوم تلقائياً بـ:
1. تحديث `version` في `package.json`.
2. تشغيل `vite build` (الذي يولّد `dist/version.json` و `dist/desktop-release.json` و `desktop-release.json` بالقيمة الجديدة).
3. حزم `dist/` إلى `DTS-Store-v{X.Y.Z}-dist.zip`.
4. رفع الـ ZIP إلى bucket `desktop-releases` عبر Supabase Storage API (باستخدام `SUPABASE_SERVICE_ROLE_KEY`).
5. رفع `desktop-release.json` و `version.json` المحدّثَين إلى نفس الـ bucket مع `cacheControl: 0` و `upsert: true`.
6. **خطوة التحقق (هذه تحل المشكلة):** بعد الرفع، السكربت يجلب `desktop-release.json` من الـ URL العام مع `?_t=Date.now()` ويتأكد أن `web_version === النسخة الجديدة`. إذا لم تتطابق، يفشل بخطأ واضح ويعيد المحاولة.
7. يفشل أيضاً إذا لم يجد ملف الـ ZIP المرفوع (HEAD request).

### الطبقة 3: حماية في وقت التشغيل (Runtime Guard)

- إضافة فحص في `UpdateChecker.tsx`: إذا كان `desktop_release.web_version` **أقل من** `LOCAL_VERSION` (أي القناة متخلفة عن البناء المحلي)، يعرض تحذيراً واضحاً في **صفحة تشخيص التحديثات** فقط (للمسؤول): "قناة التحديث متخلّفة — قم بإعادة رفع v{X}". هذا يكشف الانحراف فوراً.

## الملفات التي ستُعدَّل/تُنشأ

| الملف | التغيير |
|------|---------|
| `scripts/release-desktop.mjs` | **جديد** — سكربت الإصدار الكامل مع التحقق |
| `package.json` | إضافة سكربت `release:desktop` |
| `vite.config.ts` | قراءة `APP_VERSION` من `package.json` بدل الثابت الصلب، وتوليد `desktop-release.json` ضمن `versionJsonPlugin` |
| `src/pages/UpdateDiagnostics.tsx` | إضافة تنبيه "Channel Behind Build" عند اكتشاف انحراف |
| `desktop-release.json` (جذر + public) | تُحذف من التحرير اليدوي — تُولَّد آلياً |

## فوائد الحل

- **استحالة نسيان ملف**: المصدر واحد + التوليد آلي.
- **استحالة نشر غير مكتمل**: خطوة التحقق ما بعد الرفع تفشل بصوت عالٍ.
- **كشف فوري للانحراف**: حتى لو حدث خطأ، صفحة التشخيص تعرضه قبل أن يبلّغ المستخدم.
- **خطوة واحدة بدلاً من 8**: `npm run release:desktop -- 4.4.9 "..."`.

## ملاحظة تشغيلية

السكربت يحتاج `SUPABASE_SERVICE_ROLE_KEY` في البيئة عند تشغيله. هذا المفتاح متاح بالفعل في أسرار المشروع (`secrets`)، وسيتم تمريره كمتغير بيئة عند تنفيذ السكربت من sandbox الـ AI.
