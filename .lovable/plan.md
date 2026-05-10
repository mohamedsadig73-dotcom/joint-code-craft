# خطة تنفيذ: استبدال وحدة WMS بالتصميم الجديد

## المبدأ
- استبدال طبقة UI/UX لوحدة WMS فقط.
- لا يُمَس: الصناديق، الإقرارات، الصيانة، العقود، المستخدمين، العهد، العطل، الرواتب، السجل المرجعي للموظفين، Petty Cash، أي Module آخر.
- الحفاظ على نفس قاعدة البيانات الحالية + إضافة جداول جديدة فقط للوحدات المفقودة (تصنيفات، وحدات قياس، تحويلات، جرد، اعتمادات، تنبيهات WMS).

## النطاق المعتمد (إجابات المستخدم)
1. **النطاق:** كل وحدات التصميم كاملة (تشمل بناء الجداول الناقصة).
2. **الثيم:** داكن/فاتح حسب `ThemeProvider` — تحويل ألوان HTML الخام إلى HSL design tokens.
3. **المسارات:** بنية `/wms/*` موحّدة + redirects من المسارات القديمة (`/inventory`, `/wms`, `/wms/reports`, `/boxes/items`).

## بنية المسارات الجديدة
```text
/wms                  → Dashboard (KPIs + charts)
/wms/items            → الأصناف (Items Master)
/wms/items/:id        → تفاصيل الصنف
/wms/categories       → التصنيفات
/wms/units            → وحدات القياس
/wms/warehouses       → المخازن
/wms/locations        → المواقع الداخلية (Bins/Zones)
/wms/receipts         → سندات الاستلام (GRN)
/wms/issues           → سندات الصرف
/wms/transfers        → التحويلات بين المخازن
/wms/stocktake        → الجرد
/wms/approvals        → الاعتمادات
/wms/alerts           → التنبيهات (Min stock / Expiry)
/wms/reports          → التقارير
```
Redirects: `/inventory→/wms`, القديم `/wms/reports→/wms/reports` (ثابت), `/boxes/items→/wms/items`.

## التنفيذ على مراحل

### المرحلة 1 — البنية التحتية (Layout + Tokens)
- `src/features/wms/layout/WmsLayout.tsx` — Sidebar + Topbar + content shell خاص بوحدة WMS فقط (لا يؤثر على Layout بقية النظام).
- `src/features/wms/styles/wms-theme.css` — استخراج جميع ألوان `:root` من ملف HTML وتحويلها إلى HSL مع متغيرات `--wms-*` تستجيب للوضع الداكن/الفاتح.
- `src/features/wms/components/` — `WmsCard`, `WmsKpi`, `WmsTable`, `WmsModal`, `WmsToolbar`, `WmsBadge`, `WmsSearchBar`, `WmsEmptyState`, `WmsMobileBottomNav`.
- جميع المكوّنات <300 سطر، عربية/إنجليزية كاملة (zero hardcoded strings)، RTL/LTR ديناميكي.

### المرحلة 2 — قاعدة البيانات (إضافات فقط)
Migration واحد يضيف الجداول المفقودة دون لمس الجداول الحالية:
- `wms_categories` (شجرية: parent_id)
- `wms_units` (وحدات القياس + معاملات التحويل)
- `wms_warehouses` (إن لم تكن موجودة كاملة)
- `wms_locations` (Zone/Aisle/Rack/Bin)
- `wms_receipts` + `wms_receipt_lines`
- `wms_issues` + `wms_issue_lines`
- `wms_transfers` + `wms_transfer_lines`
- `wms_stocktakes` + `wms_stocktake_lines`
- `wms_approvals` (طلبات اعتماد للحركات)
- `wms_alerts` (مولّدة من triggers على مستويات المخزون والصلاحية)
- ربط الأصناف الحالية بـ category_id / unit_id عبر أعمدة nullable مضافة (دون كسر بيانات قديمة).
- RLS كامل: مدير = الكل، مستخدم = حسب الصلاحيات الحالية، Soft delete (deleted_at) لجميع الجداول.
- Triggers لتحديث الأرصدة + توليد التنبيهات.

### المرحلة 3 — ربط الشاشات الحالية بالتصميم الجديد
- `WmsDashboard` → KPIs + charts (RTLEChart، NO Recharts).
- `ItemsMaster` → جدول جديد بالتصميم + Image upload + Barcode + Smart search.
- `Inventory` (Stock/Transactions/Locations/Custody) → أربع شاشات منفصلة.
- ItemDetails → بطاقة الصنف بالتصميم الجديد + سجل الحركات + الصور.

### المرحلة 4 — الشاشات الجديدة (تتطلب جداول المرحلة 2)
- التصنيفات، الوحدات، المخازن، المواقع، الاستلام، الصرف، التحويلات، الجرد، الاعتمادات، التنبيهات.

### المرحلة 5 — الطباعة + المحمول
- `WmsPrintEngine` (iframe + Blob للويب، printToPDF لـ Electron) لقوالب: GRN، سند صرف، تحويل، جرد، تقارير.
- `WmsMobileBottomNav` للجوال داخل وحدة WMS فقط.

### المرحلة 6 — Routes + Hooks + اللغة
- إضافة المسارات الجديدة في `AnimatedRoutes.tsx` تحت `WmsLayout` (lazy).
- Redirects للمسارات القديمة.
- Hooks: `useWmsItems`, `useWmsStock`, `useWmsReceipts`, `useWmsIssues`… (Zustand + React Query).
- إضافة جميع المفاتيح العربية/الإنجليزية في `src/locales/ar.ts` و `src/locales/en.ts` تحت namespace `wms.*`.

### المرحلة 7 — نشر إصدار سطح المكتب
حسب سياسة Auto-Publish: bump إلى v4.6.6 + بناء + رفع ZIP + `version.json` + `desktop-release.json` بعد كل مرحلة كبيرة.

## ضمانات عدم المساس بباقي النظام
- كل ملفات الميزة داخل `src/features/wms/**` فقط.
- لا تعديل على: `src/components/boxes/**`, `src/components/declarations/**`, `src/components/maintenance/**`, `src/components/petty-cash/**`, `src/components/holiday-attendance/**`, `src/pages/Boxes*`, `src/pages/Declaration*`, `src/pages/Maintenance*`, `src/pages/HolidayAttendance*`, `src/pages/PettyCash*`, `src/pages/Employees*`, `src/pages/Leave*`.
- إعادة استخدام `LanguageContext`, `ThemeProvider`, `supabase client`, `RTLEChart`, `WorkDatePicker`, `PrintEngine` كما هي.

## حجم العمل المتوقع
- ~25 ملف React جديد، ~6 hooks جديدة، 1 migration كبير، تحديث ar.ts/en.ts.
- التنفيذ على دفعات؛ بعد كل مرحلة أرفع نسخة Desktop وأخبرك بالتقدم.

## أبدأ بـ
المرحلة 1 + المرحلة 2 معاً (Layout/Tokens + Migration الجداول الناقصة)، لأن باقي المراحل تعتمد عليهما.

هل تعتمد الخطة لأبدأ التنفيذ؟
