

## المشكلة
حالياً `electron/main.cjs` يحمّل من ملفات محلية (`dist/index.html`)، لذلك كل تحديث يتطلب تنزيل نسخة جديدة كاملة.

## الحل: تحميل من الموقع المنشور مباشرة

تغيير واحد في `electron/main.cjs`:

```text
قبل:  win.loadFile('dist/index.html')   ← ملفات ثابتة محلية
بعد:  win.loadURL('https://dts-store.lovable.app')  ← الموقع الحي
```

مع fallback للنسخة المحلية عند انقطاع الإنترنت.

### التغييرات

**1. `electron/main.cjs`**
- استبدال `loadFile` بـ `loadURL('https://dts-store.lovable.app')`
- إضافة fallback: عند فشل التحميل يرجع للنسخة المحلية
- إضافة `did-fail-load` listener كشبكة أمان إضافية

**2. بناء نسخة Windows جديدة (آخر مرة)**
- هذه ستكون **آخر نسخة تحتاج تنزيلها** — بعدها كل التحديثات تظهر تلقائياً

### النتيجة
- أي تعديل هنا يظهر **فوراً** في تطبيق Windows بدون تنزيل
- التطبيق يعمل بدون إنترنت (fallback للنسخة المحلية)
- `UpdateChecker` يبقى فقط للتنبيه بتحديثات هيكلية كبيرة في Electron نفسه

