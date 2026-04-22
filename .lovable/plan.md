

## وحدة جديدة: نظام إدارة الصناديق والاستلام (Boxes & Receipts)

سأضيف وحدة كاملة للبرنامج الحالي (DTS-Store) لإدارة استلام البضائع من الموردين، فرزها حسب الوجهة، تعبئتها في صناديق مرقّمة، وطباعة بطاقات الصناديق مع صور المنتجات. الوحدة ستندمج بسلاسة مع البنية القائمة (Supabase, RLS, App Launcher, Navigation, RTL/LTR, Dark/Light, Soft Delete, Audit Logs).

---

### 1. قاعدة البيانات (Supabase Migration)

#### جدول `box_receipts` (سجل الاستلام)
```text
- id (uuid, PK)
- serial_no (int, auto-increment)
- supplier (text)            — المورد
- part_no (text)             — رقم القطعة
- description (text)         — الوصف
- qty (int)                  — الكمية
- unit (enum: PCS|SET|BOX|KG|MTR|LTR|PAIR)
- destination (enum: morocco | uzbekistan | unspecified)
- place (text, default 'مخزنة بالمخزن (B)')
- box_no (text)              — رقم الصندوق (B-01)
- receipt_date (date)
- status (enum: received | sorted | packed | shipped)
- notes (text)
- image_path (text)          — مسار الصورة في Storage
- created_by (uuid)
- created_at, updated_at
- deleted_at, deleted_by      — Soft delete (سياسة 30 يوم)
```

#### View `box_summary` (ملخص الصناديق — محسوب تلقائياً)
```sql
SELECT box_no,
       string_agg(DISTINCT supplier, ' / ') as suppliers,
       destination,
       COUNT(*) as items_count,
       SUM(qty) as total_qty,
       MIN(receipt_date) as date
FROM box_receipts WHERE deleted_at IS NULL
GROUP BY box_no, destination;
```

#### Storage Bucket
- `box-images` (public, max 5MB، يقبل jpg/png/webp)
- اسم الملف = `part_no` (مثل `BS.IDS00005.jpg`)

#### RLS Policies
- المستخدم المسجل يقرأ الكل
- المستخدم يضيف/يعدل سجلاته فقط
- Admin/Manager يعدلون كل السجلات
- نفس سياسة Soft Delete الحالية

#### Audit Trigger
- ربط الجدول بـ `audit_logs` (مثل بقية الوحدات)

---

### 2. الصفحات الجديدة (Routes)

| المسار | الصفحة | الوصف |
|---|---|---|
| `/boxes` | **BoxesManagement** | الصفحة الأم — Tabs: استلام / صناديق / لوحة |
| `/boxes/card/:boxNo` | **BoxCardPrint** | بطاقة الصندوق القابلة للطباعة (A4) |

نمط Tabs (سياسة قائمة لتقليل التعقيد):
- **Tab 1: سجل الاستلام** — جدول كامل + إضافة/تعديل/حذف + استيراد Excel + بحث وفلترة
- **Tab 2: ملخص الصناديق** — Cards Grid لكل صندوق + ملخص علوي + فلترة + تصدير
- **Tab 3: لوحة الإحصائيات** — KPI Cards + RTLEChart (شريطي/دائري) + آخر النشاطات

---

### 3. المكوّنات الجديدة

```text
src/components/boxes/
├── ReceiptsTab.tsx              — جدول الاستلام (orchestrator)
├── ReceiptsTable.tsx            — VirtualizedList للأداء
├── ReceiptFormDialog.tsx        — Add/Edit modal (zod validation)
├── ReceiptMobileCard.tsx        — Card view للجوال (mobile-first)
├── ReceiptImageUpload.tsx       — رفع صورة بـ Supabase Storage
├── BoxesSummaryTab.tsx          — Grid للصناديق
├── BoxCard.tsx                  — كرت ملخص صندوق واحد
├── BoxesDashboardTab.tsx        — KPIs + Charts
└── BoxCardPrintLayout.tsx       — Layout الطباعة A4

src/pages/
├── BoxesManagement.tsx          — صفحة Tabs الرئيسية
└── BoxCardPrint.tsx             — صفحة الطباعة المستقلة

src/hooks/
├── useBoxReceipts.ts            — CRUD + realtime
├── useBoxSummary.ts             — جلب الـ view
└── useBoxStats.ts               — إحصائيات اللوحة

src/utils/
├── boxesExcelExport.ts          — تصدير ExcelJS (مع RTL وألوان)
└── boxNumberValidation.ts       — تنسيق B-XX
```

كل المكوّنات < 300 سطر.

---

### 4. التكامل مع النظام الحالي

| النقطة | التغيير |
|---|---|
| **App Launcher (`Home.tsx`)** | إضافة بطاقة "إدارة الصناديق" مع أيقونة Package |
| **Navigation.tsx** | إضافة عنصر `boxesManagement` بعد "الصيانة" |
| **AnimatedRoutes.tsx** | تسجيل المسارين الجديدين مع Lazy Loading |
| **MobileBottomNav** | إضافة الأيقونة في قائمة "المزيد" |
| **LanguageContext** | إضافة كل المفاتيح (AR/EN) — لا نص hardcoded |
| **types/database** | يُحدَّث تلقائياً من Supabase |

---

### 5. المواصفات البصرية (موحّدة مع النظام)

- **التصميم:** Clean Minimalist — متطابق مع بقية الوحدات (PageHeader, Card, Badge)
- **الألوان:**
  - Destination المغرب → Badge برتقالي
  - Destination أوزبكستان → Badge أخضر
  - Destination غير محدد → Badge رمادي
- **الجدول:** صفوف مظلّلة بلون الوجهة بشفافية خفيفة (متوافقة مع Dark/Light)
- **التواريخ:** `DD/MM/YYYY` — **الأرقام:** فواصل آلاف غربية (1,000)
- **الخط:** Segoe UI Arabic / Inter

---

### 6. ميزات الطباعة (بطاقة الصندوق)

- **A4 Portrait** — هوامش 10mm
- **iframe + Blob** للويب / **`webContents.printToPDF`** للـ Electron (سياسة قائمة)
- Header يتكرر في كل صفحة
- صور المنتجات بحجم ثابت (≈80×80px) أو fallback لرقم القطعة
- زر تنقّل: السابق / التالي / اختيار صندوق
- تغيير `document.title` مؤقتاً لـ "Box-Card-B-01"
- **QR Code** على البطاقة (يحوي `box_no` + `total_qty`)

---

### 7. التصدير والاستيراد لـ Excel

- **التصدير:** ExcelJS، ورقتان (سجل الاستلام + ملخص الصناديق)، ألوان حسب الوجهة، RTL
- **الاستيراد:** زر "استيراد"، يقرأ `.xlsx` بـ ExcelJS، معاينة قبل الحفظ، تخطّي المكررات

---

### 8. الإحصائيات (Dashboard Tab)

**KPI Cards:** الأصناف | الكمية | الصناديق | الموردين | المغرب | أوزبكستان

**Charts (RTLEChart — Apache ECharts):**
- Bar: الكمية لكل صندوق
- Pie: التوزيع حسب الوجهة
- Bar: الأصناف لكل مورد

**آخر النشاطات:** آخر 10 سجلات

---

### 9. الصلاحيات (RBAC)

- **Admin** → كل الصلاحيات + حذف نهائي
- **Manager** → إضافة/تعديل/حذف ناعم/تصدير/طباعة
- **User** → إضافة/تعديل سجلاته فقط، عرض الكل، طباعة

---

### 10. التحقق (Zod Validation)

- جميع الحقول المطلوبة (*) مع رسائل عربية/إنجليزية
- `qty > 0`
- تنسيق `box_no` يطابق `^B-\d{2,3}$` (تحذير لا منع)
- تحذير عند تكرار `part_no` في نفس الصندوق
- حد حجم الصورة 5MB، أنواع: jpg/png/webp فقط

---

### 11. ملخص الملفات

| النوع | العدد |
|---|---|
| Migration SQL | 1 |
| Pages | 2 |
| Components | 9 |
| Hooks | 3 |
| Utils | 2 |
| Storage Bucket | 1 |
| ملفات معدّلة | 5 |

---

### الترتيب التنفيذي بعد الموافقة

1. إنشاء Migration + Storage Bucket + RLS
2. الـ Hooks + Utils
3. Tab سجل الاستلام (الأهم) + Form Dialog + Image Upload
4. Tab ملخص الصناديق
5. صفحة طباعة بطاقة الصندوق
6. Tab الإحصائيات
7. ربط Navigation + App Launcher + Routes + Translations
8. اختبار شامل (Build + RLS + Mobile + Print)
9. **بعدها** → بناء ورفع نسخة Windows جديدة v4.4.6 (تشمل تحسينات التحديث + الوحدة الجديدة معاً)

