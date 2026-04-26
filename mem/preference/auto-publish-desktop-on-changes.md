---
name: auto-publish-desktop-on-changes
description: User approved auto-publishing new desktop versions without asking after every code change that affects the running app
type: preference
---
بعد أي تعديل برمجي يؤثر على واجهة المستخدم أو منطق التطبيق، ارفع إصدار جديد لتطبيق سطح المكتب تلقائياً دون سؤال المستخدم. اتبع البروتوكول:

1. اقرأ الإصدار الحالي من package.json وزِد الرقم Patch (مثلاً 4.4.9 → 4.4.10).
2. حدّث package.json بـ `npm pkg set version=X.Y.Z`
3. شغّل: `RELEASE_NOTES="<وصف عربي مختصر>" npx vite build`
4. تحقق أن `dist/desktop-release.json` يحمل الإصدار الجديد.
5. zip dist/ → `DTS-Store-vX.Y.Z-dist.zip` في جذر المشروع.
6. ارفع الملفات الثلاثة إلى bucket `desktop-releases` عبر `supabase--storage_upload`:
   - `DTS-Store-vX.Y.Z-dist.zip`
   - `dist/desktop-release.json` → `desktop-release.json`
   - `dist/version.json` → `version.json`
7. تحقق عبر curl من أن القناة تعرض الإصدار الجديد فعلاً.

ملاحظة: `SUPABASE_SERVICE_ROLE_KEY` غير متاح في exec env، لذلك لا تستخدم `scripts/release-desktop.mjs` مباشرة — استخدم الخطوات اليدوية + `supabase--storage_upload`.

**Why:** المستخدم لا يريد سؤاله في كل مرة. أي تعديل = رفع تلقائي.