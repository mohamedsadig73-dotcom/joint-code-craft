## الهدف
نقل النمط البصري والوظيفي الاحترافي من ملف `WMS Pro v2.0` المرفق إلى كل نوافذ النظام الحالية، مع الحفاظ على المنطق والـ RTL والـ shadcn/ui.

## ما سيُطبَّق من الملف المرجعي

### 1. نظام الألوان والـ Tokens (في `src/index.css`)
أضف متغيرات WMS Pro للـ Dark Mode:
```text
--bg, --bg2, --bg3, --bg4 (تدرج 4 مستويات للخلفية)
--border, --border2 (مستويين للحدود)
--accent-soft, --accent-soft2 (طبقات شفافة للـ Primary)
--green-soft, --red-soft, --yellow-soft, --purple-soft, --teal-soft
--radius: 10px, --radius-sm: 6px
```
تطبيق نفس التدرج على Light Mode بقيم مقلوبة.

### 2. نظام Modal موحد جديد — `StandardModal`
ملف جديد: `src/components/ui/StandardModal.tsx`

البنية الموحدة:
```text
┌─────────────────────────────────┐
│ [العنوان]              [✕]      │ ← header sticky + border
├─────────────────────────────────┤
│  [Alert (اختياري)]              │
│                                 │
│  ── التصنيف والكود ──           │ ← section-divider
│  [Grid 3 columns]               │
│                                 │
│  ── بيانات الصنف ──             │
│  [Grid 2 columns]               │
│                                 │
│  ┌─ الاسم المُولَّد ─┐         │ ← preview box (bg4)
│  └───────────────────┘         │
└─────────────────────────────────┘
│ [حفظ Primary] [إلغاء Ghost]    │ ← footer sticky
└─────────────────────────────────┘
```

Props:
- `title`, `subtitle`
- `sections: { title, columns: 1|2|3, fields: ReactNode }[]`
- `alert?: { type: 'info'|'warn'|'success'|'danger', message }`
- `preview?: { label, value }` (مثل "الاسم المولد تلقائياً")
- `primaryAction`, `secondaryAction`

### 3. مكونات Form موحدة
ملف جديد: `src/components/ui/StandardForm.tsx`

تصدير:
- `<FormSection title="..." columns={3}>` — قسم بـ section-divider في الأعلى
- `<FormField label="..." required hint="...">` — حقل بـ label موحد + hint تحته
- `<FormCode>` — Input بخط mono وـ accent (للأكواد المولدة)
- `<InputGroup>` — Input + Button ملتصقين (مثل الباركود + زر "توليد")
- `<GeneratedPreview label="..." value="..." />` — صندوق المعاينة بـ bg4
- `<FuzzyWarning items={...} />` — تحذير "وُجِد X صنف مشابه"

### 4. Badges احترافية
تحديث `src/components/ui/badge.tsx` بـ variants جديدة:
- `badge-blue`, `badge-green`, `badge-red`, `badge-yellow`, `badge-purple`, `badge-teal`, `badge-gray`
كلها بنفس النمط: خلفية soft + لون نص قوي + radius كامل (20px) + أيقونة صغيرة قبل النص.

### 5. أزرار موحدة
تحديث `src/components/ui/button.tsx`:
- `btn-primary`: خلفية accent كاملة + hover أغمق
- `btn-ghost`: شفاف + border خفيف + hover bg3
- `btn-danger`: خلفية red-soft + نص أحمر
- `btn-success`: خلفية green-soft + نص أخضر
- أحجام `xs`, `sm`, `default`

### 6. Section Divider — مكون مساعد
```text
┌────────────────────────────────
│ التصنيف والكود          ← font-size 11px, uppercase, text3
│ ━━━━━━━━━━━━━━━━━━━━━  ← border-bottom
└────────────────────────────────
```

## النوافذ التي سيُعاد تصميمها (بالأولوية)

### المرحلة A — النوافذ الأساسية (10 نوافذ)
1. **إضافة/تعديل صنف** (`ItemFormDialog`) — مع Sections + Generated Name + Fuzzy Warning + Input Group للباركود
2. **سند استلام** (`InventoryTransactionDialog` type=in)
3. **سند صرف** (type=out)
4. **سند تحويل** (type=transfer)
5. **سند إرجاع** (type=return)
6. **إضافة موظف** (`EmployeesManagement`)
7. **إضافة مصروف نثرية** (`AddExpenseDialog`)
8. **فتح فترة نثرية** (`OpenPeriodDialog`)
9. **إغلاق فترة** (`ClosePeriodDialog`)
10. **إضافة صندوق** (`BoxesManagement`)

### المرحلة B — النوافذ الثانوية (8 نوافذ)
11. إضافة أصل صيانة، إضافة مورد، إضافة بند صيانة
12. إضافة مخزن، إضافة موقع، إضافة مركز تكلفة
13. إنشاء بيان (`CreateDeclarationDialog`)
14. حوار حذف موحد (`DeleteConfirmationDialog`) — بنمط `btn-danger` + alert-danger

### المرحلة C — التحسينات الوظيفية المنقولة من WMS Pro
- **Generated Code Preview**: في إضافة الصنف، عرض الكود الداخلي (FUR-TAB-00009) كـ readonly بخط mono فور اختيار التصنيف.
- **Auto-generated Name**: عرض الاسم المولد ديناميكياً (نوع + مواصفة + علامة + وحدة) في صندوق معاينة.
- **Fuzzy Match**: تحذير عند كتابة اسم مشابه لصنف موجود ("وُجِد صنف مشابه: طاولة طعام").
- **Stock Bar**: شريط أفقي ملوّن تحت الكمية (أحمر إذا = 0، أصفر إذا ≤ min، أخضر طبيعي).
- **Status Badges بأيقونات**: ↓ استلام / ↑ صرف / ⇄ تحويل بدلاً من نص فقط.

## الملفات الجديدة
- `src/components/ui/StandardModal.tsx`
- `src/components/ui/StandardForm.tsx` (يصدّر FormSection, FormField, FormCode, InputGroup, GeneratedPreview, FuzzyWarning)
- `src/components/ui/SectionDivider.tsx`
- `src/components/ui/StockBar.tsx`
- `src/hooks/useFuzzyMatch.ts` (للبحث عن أصناف مشابهة بـ Levenshtein)

## الملفات المعدّلة
- `src/index.css` — إضافة tokens WMS Pro
- `src/components/ui/button.tsx` — variants جديدة
- `src/components/ui/badge.tsx` — variants جديدة
- جميع نوافذ المرحلة A و B (إعادة كتابة باستخدام StandardModal)
- `src/locales/ar.ts` و `en.ts` — مفاتيح ترجمة جديدة (sectionDivider titles, hints)

## الترتيب الزمني
1. Tokens + Button + Badge + StandardModal + StandardForm (الأساس)
2. المرحلة A (10 نوافذ أساسية)
3. التحسينات الوظيفية (Fuzzy / Generated Name / Stock Bar)
4. المرحلة B (8 نوافذ ثانوية)
5. اختبار شامل في AR/EN + Light/Dark
6. نشر نسخة Desktop جديدة (حسب Auto-Publish Protocol)

## ما لن يتغير
- المنطق التجاري والـ Hooks
- بنية الـ Database و RLS
- نظام التوجيه (Routing)
- صلاحيات RBAC
- آلية الطباعة والتصدير

## النتيجة المتوقعة
كل نافذة في النظام ستبدو وتتصرف بنفس مستوى الاحترافية الذي تراه في الملف المرجعي WMS Pro: تنظيم بصري واضح بـ Section Dividers، أكواد مولدة فوراً، تحذيرات ذكية للتشابه، أزرار وألوان موحدة 100%، وتجربة استخدام متناسقة سواء في AR أو EN.

**تقدير الحجم**: ~25 ملف جديد/معدّل، عمل مركّز في 3-4 جولات تنفيذ.
