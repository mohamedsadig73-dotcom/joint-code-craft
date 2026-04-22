

## تطوير النظام: من "إدارة الصناديق" إلى "نظام الاستلام والفرز والشحن المتكامل"

### 🎯 التحول الجوهري
النظام الحالي يفترض أن **كل صنف = صندوق**. الواقع التشغيلي مختلف: بعض الأصناف (إطارات، زيوت، مواد كبيرة) تُشحن **بدون صناديق** (Loose). كما أن الكونتينرات هي المرحلة النهائية الفعلية للشحن — وهي غير موجودة في النظام حالياً.

---

### 1. تعديلات قاعدة البيانات

#### أ. تعديل جدول `box_receipts` (إعادة تسمية مفاهيمية)
سنحتفظ باسم الجدول لتجنب كسر البيانات الحالية، لكن نضيف:

```sql
-- نوع التعبئة
CREATE TYPE packing_type AS ENUM ('boxed', 'loose');

ALTER TABLE box_receipts 
  ADD COLUMN packing_type packing_type NOT NULL DEFAULT 'boxed',
  ALTER COLUMN box_no DROP NOT NULL;  -- box_no يصبح اختياري للـ loose

-- تحقق: إذا boxed يجب وجود box_no
ALTER TABLE box_receipts 
  ADD CONSTRAINT chk_box_no_required 
  CHECK (packing_type = 'loose' OR (packing_type = 'boxed' AND box_no IS NOT NULL AND box_no != ''));
```

#### ب. تحديث `box_summary` view
استبعاد الأصناف الـ loose من ملخص الصناديق (هي ليست في صناديق):
```sql
WHERE deleted_at IS NULL AND packing_type = 'boxed'
```

#### ج. جداول جديدة للكونتينرات

**`shipping_containers`** (الكونتينرات):
```text
- id (uuid)
- container_no (text, unique)        — رقم الكونتينر
- shipping_company (text)            — شركة الشحن
- destination (enum: morocco | uzbekistan)
- shipped_date (date, nullable)
- status (enum: preparing | sealed | shipped | delivered)
- notes (text)
- created_by, created_at, updated_at
- deleted_at, deleted_by              — Soft delete
```

**`container_items`** (محتويات الكونتينر — يربط الكونتينر بالاستلامات):
```text
- id (uuid)
- container_id (uuid → shipping_containers)
- receipt_id (uuid → box_receipts)
- added_at (timestamp)
- added_by (uuid)
UNIQUE(container_id, receipt_id)
```
> هذا الجدول يربط كلاً من **الصناديق المُعبَّأة** والأصناف **الـ Loose** مباشرةً بالكونتينر، عبر سجلات الاستلام نفسها.

#### د. View جديد `container_summary`
يجمع لكل كونتينر:
- عدد الصناديق المختلفة (count distinct box_no حيث packing_type='boxed')
- عدد الأصناف الـ loose
- إجمالي الكمية
- قائمة الموردين

#### هـ. RLS + Audit Triggers
- نفس سياسة `box_receipts` (المستخدم يقرأ الكل، Admin/Manager يديرون الكل)
- ربط الجداول الجديدة بـ `audit_logs`

---

### 2. تحديث الواجهة

#### أ. `ReceiptFormDialog.tsx` — الحقل الجديد
```text
[Radio Group]: نوع التعبئة *
  ◉ صندوق (Boxed)        — يُظهر حقل "رقم الصندوق"
  ◯ بدون صندوق (Loose)   — يُخفي "رقم الصندوق" + ينبه: "سيُشحن مباشرة في الكونتينر"
```
- منطق ديناميكي: عند اختيار `loose`، يُخفى حقل `box_no` ويُمسح
- تحديث Zod schema: `box_no` مطلوب فقط إذا `packing_type = 'boxed'`

#### ب. `ReceiptsTable.tsx` + `ReceiptMobileCard.tsx`
- إضافة عمود/شارة **"نوع التعبئة"** (Badge أزرق "صندوق" / Badge بنفسجي "بدون صندوق")
- عند `loose`: عرض "—" بدل رقم الصندوق
- فلتر جديد: الكل / صناديق فقط / بدون صناديق

#### ج. `BoxesSummaryTab.tsx`
- يعرض فقط `packing_type = 'boxed'` (بالفعل سيحدث تلقائياً عبر تحديث الـ view)
- إضافة بطاقة منفصلة في الأعلى: **"الأصناف غير المعبأة (Loose)"** مع عدّاد قابل للنقر يفتح قائمة بها

#### د. `BoxesDashboardTab.tsx`
- KPI جديد: **أصناف Loose**
- Pie جديد: **التوزيع بحسب نوع التعبئة** (Boxed vs Loose)

---

### 3. وحدة الكونتينرات الجديدة (Tab رابع في BoxesManagement)

#### Tab "الكونتينرات والشحن":
- **القائمة:** جدول الكونتينرات (رقم، شركة الشحن، الوجهة، عدد الصناديق، عدد Loose، الحالة، التاريخ)
- **زر "كونتينر جديد":** Dialog لإنشاء كونتينر فارغ
- **عند فتح كونتينر:** صفحة `/boxes/container/:id` تعرض:
  - بيانات الكونتينر + زر تعديل
  - **قسمان:**
    1. **الصناديق داخل الكونتينر** — قائمة الصناديق المُضافة + زر "إضافة صندوق" يفتح dialog يعرض الصناديق المتاحة (status='packed' وغير مرتبطة بكونتينر آخر)
    2. **الأصناف Loose داخل الكونتينر** — قائمة الـ loose المُضافة + زر "إضافة صنف" مشابه
  - زر "ختم الكونتينر" (يحوّل الحالة لـ `sealed`)
  - زر "طباعة بوليصة الكونتينر" (Container Manifest A4)

#### مكونات جديدة:
```text
src/components/boxes/containers/
├── ContainersTab.tsx              — قائمة الكونتينرات
├── ContainerFormDialog.tsx        — إنشاء/تعديل كونتينر
├── ContainerDetailsView.tsx       — صفحة تفاصيل كونتينر
├── AddItemsToContainerDialog.tsx  — اختيار صناديق/loose للإضافة
└── ContainerManifestPrint.tsx     — بوليصة طباعة A4

src/hooks/
├── useContainers.ts
└── useContainerItems.ts

src/pages/
└── ContainerDetails.tsx           — Route: /boxes/container/:id
```

---

### 4. صفحة `BoxCardPrint` — تحديث
- لا تتأثر (تطبع الصناديق فقط — الـ loose ليس له بطاقة صندوق)
- إضافة تنبيه إذا حاول المستخدم طباعة `box_no` يحتوي فقط أصناف loose

---

### 5. الترجمات (LanguageContext)

مفاتيح جديدة (AR/EN):
```
packingType, boxed, loose, boxedItems, looseItems,
packingTypeBoxedDesc, packingTypeLooseDesc,
containers, containersManagement, newContainer, containerNo,
shippingCompany, containerStatus_preparing, containerStatus_sealed,
containerStatus_shipped, containerStatus_delivered,
addToContainer, sealContainer, containerManifest,
boxesInContainer, looseItemsInContainer,
availableBoxes, availableLooseItems, printManifest,
itemsCount, looseCount, boxesCount,
filterByPackingType, allItems, boxedOnly, looseOnly
```

---

### 6. Navigation & Routes
- `/boxes` يبقى كما هو لكن يضيف **Tab رابع: "الكونتينرات"**
- Route جديد: `/boxes/container/:id` → `ContainerDetails`
- لا تغيير على Home / MobileBottomNav / Sidebar (الكل يدخل من بوابة `/boxes`)

---

### 7. صلاحيات (RBAC) للكونتينرات
- **Admin/Manager:** إنشاء، تعديل، إضافة محتويات، ختم، حذف ناعم، طباعة
- **User:** عرض فقط + طباعة

---

### 8. ملخص الملفات

| النوع | عدد |
|---|---|
| Migrations | 1 (تعديل + جداول جديدة + view) |
| Components جديدة | 5 (وحدة الكونتينرات) |
| Components معدّلة | 6 (Form, Table, MobileCard, Summary, Dashboard, Management) |
| Pages جديدة | 1 (ContainerDetails) |
| Hooks جديدة | 2 |
| Translations | ~25 مفتاح جديد |

---

### 9. الترتيب التنفيذي

1. **Migration:** إضافة `packing_type`، تخفيف `box_no`، جداول الكونتينرات، تحديث الـ view، RLS، Audit
2. **تحديث `ReceiptFormDialog`** — حقل packing_type + منطق ديناميكي
3. **تحديث `ReceiptsTable` + `ReceiptMobileCard`** — عمود + فلتر
4. **تحديث `BoxesSummaryTab` + `BoxesDashboardTab`** — عرض loose
5. **بناء وحدة الكونتينرات الكاملة** (Tab + قائمة + Dialog + صفحة تفاصيل)
6. **بوليصة طباعة الكونتينر A4** (مع QR + قائمة الصناديق + قائمة Loose)
7. **الترجمات + Routes + اختبار شامل**
8. **بعدها** → بناء v4.4.6 لـ Windows

---

### 🤔 سؤال قبل التنفيذ

هل تريد أن أنفذ **كل ما سبق دفعة واحدة** (تنفيذ شامل + يستغرق رسالة طويلة)، أم نقسمه على مرحلتين:

- **المرحلة A (الآن):** تعديل النموذج لإضافة `packing_type` + عرض Loose في الجداول والملخص (تحسين فوري للنظام الحالي)
- **المرحلة B (لاحقاً):** بناء وحدة الكونتينرات الكاملة (شغل أكبر، يحتاج اختبار منفصل)

التوصية: **البدء بالمرحلة A** أولاً (لأنها تصلح المنطق الجوهري فوراً)، ثم B في رسالة تالية.

