

# خطة فصل البيانات: قاموس الأصناف + سجل الحركات

## الفكرة الأساسية
نقسم البيانات الحالية في `box_receipts` إلى طبقتين منفصلتين:

1. **قاموس الأصناف (Items Master)** — تعريف ثابت لكل قطعة، `part_no` فريد بشكل مطلق
2. **سجل الحركات (Receipts/Transactions)** — كل حركة استلام أو شحن مرتبطة بصنف موجود، مع وجهتها وكميتها وصندوقها

```text
items_master (قاموس - فريد)              box_receipts (حركات - متعدد)
─────────────────────────────             ─────────────────────────────
part_no  (فريد)         ◄────── FK ─────  item_id  (مرجع للقاموس)
description                                serial_no
unit_default                               qty
default_supplier                           destination (المغرب/أوزبكستان)
image_path                                 box_no
weight, dimensions (اختياري)               receipt_date
created_at                                 status, notes, packing_type
```

---

## 1. قاعدة البيانات

### جدول جديد: `items_master`
- `id` (uuid PK)
- `part_no` (text, **UNIQUE**) — الرقم الفريد بشكل مطلق
- `description` (text)
- `default_supplier` (text)
- `default_unit` (enum من box_unit)
- `image_path` (text, nullable)
- `notes` (text, nullable)
- `is_active` (boolean, default true)
- `created_by`, `created_at`, `updated_at`

**RLS**: مشاهدة لكل المستخدمين، إنشاء/تعديل للأدمن والمدير فقط.

### تعديل `box_receipts`
- إضافة `item_id` (uuid, FK → items_master.id)
- الإبقاء على `part_no` و `description` و `supplier` كحقول مرآة (Denormalized) للأداء والتاريخ — تُملأ تلقائياً من القاموس عند الإدخال.
- لا نفرض `UNIQUE` على `part_no` في box_receipts (الحركات تتكرر بشكل مشروع).

### Migration للبيانات الحالية
- استخراج `part_no` فريدة من `box_receipts` الموجودة (140 سجل) → إدخالها في `items_master`.
- ربط كل سجل في `box_receipts` بـ `item_id` المناسب.

---

## 2. الواجهة (UI/UX)

### أ) صفحة جديدة: "قاموس الأصناف" `/boxes/items`
- جدول لكل الأصناف المعرّفة (part_no, description, supplier, unit, عدد الحركات المرتبطة).
- زر "إضافة صنف جديد" → يفتح حوار:
  - إدخال part_no → فحص فوري: إذا موجود ← رسالة "هذا الصنف موجود مسبقاً" مع زر "عرضه".
- بحث + فلترة + تعديل + حذف ناعم (لا يمكن حذف صنف له حركات نشطة).
- استيراد دفعي من Excel (مع كشف التكرارات).

### ب) تعديل حوار "إضافة سجل استلام" (ReceiptFormDialog)
استبدال حقل `part_no` النصي بـ:
- **Combobox/Searchable Dropdown** للبحث عن صنف من القاموس.
- عند الاختيار: يُملأ تلقائياً (description, supplier, unit, image).
- زر "+ صنف جديد" بجانبها لإضافة صنف غير موجود دون مغادرة الحوار.
- المستخدم يكمل: qty, destination, box_no, packing_type, receipt_date, status.

### ج) تعديل استيراد Excel
عند رفع ملف يحتوي على رقم قطعة جديد:
- إذا `part_no` غير موجود في القاموس → يُسأل المستخدم: **إنشاء صنف جديد تلقائياً** أو **تخطّي**.
- إذا موجود → الحركة تُسجل وترتبط تلقائياً بنفس `item_id` (حتى لو في سنوات مختلفة، نفس الصنف).

### د) تحديث `BoxesManagement.tsx`
- إضافة Tab خامس: **"الأصناف" (Items Master)** بجانب Receipts/Summary/Containers/Trash.
- في Receipts Tab: عمود جديد "Item ID" أو رابط لصفحة الصنف.
- صفحة تفاصيل الصنف `/boxes/items/:id` تعرض:
  - بطاقة بيانات الصنف
  - قائمة كل الحركات التاريخية لهذا الصنف (متى استُلم، إلى أي وجهة، أي صندوق، الكمية الإجمالية)

---

## 3. القواعد المنطقية

| السيناريو | السلوك |
|---|---|
| إدخال part_no جديد في القاموس | يُسجل مرة واحدة فقط — منع التكرار المطلق |
| إدخال نفس part_no في سنة قادمة | يُربط بنفس `item_id` تلقائياً، تُسجل حركة جديدة فقط |
| نفس الصنف لوجهتين مختلفتين | حركتان منفصلتان، نفس `item_id` |
| تعديل وصف الصنف | يُحدّث في القاموس فقط، الحركات القديمة تحتفظ بنسختها التاريخية |
| حذف صنف من القاموس | ممنوع إذا له حركات نشطة، يُسمح بـ "تعطيل" (is_active=false) |

---

## 4. الملفات المتأثرة

**جديدة:**
- `supabase/migrations/*_create_items_master.sql`
- `src/hooks/useItemsMaster.ts`
- `src/pages/ItemsMaster.tsx` + `src/pages/ItemDetails.tsx`
- `src/components/boxes/items/ItemFormDialog.tsx`
- `src/components/boxes/items/ItemPickerCombobox.tsx` (قائمة منسدلة بحثية)
- `src/components/boxes/items/ItemImportDialog.tsx`

**معدّلة:**
- `src/components/boxes/ReceiptFormDialog.tsx` — استبدال حقل part_no بالـ Combobox
- `src/components/boxes/ReceiptsTab.tsx` — تحديث منطق الاستيراد
- `src/pages/BoxesManagement.tsx` — إضافة Tab "الأصناف"
- `src/components/AnimatedRoutes.tsx` — تسجيل المسارات الجديدة
- `src/contexts/LanguageContext.tsx` — مفاتيح ترجمة جديدة
- `src/hooks/useBoxReceipts.ts` — تحديث الإدخال ليستقبل item_id

---

## 5. الترتيب التنفيذي
1. إنشاء جدول `items_master` + migration للبيانات الحالية (استخراج 140+ صنف فريد)
2. Hook `useItemsMaster` + صفحة قاموس الأصناف
3. Combobox البحث + استبداله في حوار إدخال السجل
4. تحديث منطق الاستيراد لربط الحركات بالقاموس
5. صفحة تفاصيل الصنف مع التاريخ الكامل
6. تحديثات الترجمة والاختبار

---

## نقطة تأكيد قبل التنفيذ
هل تريد أن **يتم ترحيل الـ 140 سجل الحالي تلقائياً** (إنشاء قاموس من البيانات الموجودة + ربط كل الحركات)؟ هذا هو السلوك المُخطط ما لم تطلب غير ذلك.

