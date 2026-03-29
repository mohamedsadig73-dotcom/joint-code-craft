

## الهدف
إزالة كل ما يتعلق بـ Electron من المشروع والإبقاء على PWA فقط.

## الملفات المطلوب حذفها
- `electron/main.cjs` — ملف Electron الرئيسي
- `electron/preload.cjs` — ملف preload
- مجلد `electron/` بالكامل

## الملفات المطلوب تعديلها

### 1. `package.json`
- حذف سطر `"main": "electron/main.cjs"` (السطر 86)

### 2. `src/vite-env.d.ts`
- حذف تعريف `electronAPI` من `Window` interface (الأسطر 4-9)
- الإبقاء على `/// <reference types="vite/client" />`

### 3. `src/components/UpdateChecker.tsx`
- حذف كود Electron bridge (`window.electronAPI?.getPublishedVersion`)
- تبسيط `fetchPublishedVersion` ليستخدم `fetch` مباشرة فقط
- حذف التعليقات المتعلقة بـ Electron

### 4. `.lovable/plan.md`
- تحديث الخطة لتعكس أن المشروع PWA فقط بدون Electron

## النتيجة
- مشروع أنظف بدون كود Electron غير مستخدم
- PWA يعمل كما هو بدون أي تأثير
- UpdateChecker يعمل للويب فقط

