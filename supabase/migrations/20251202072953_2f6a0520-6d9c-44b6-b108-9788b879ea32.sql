-- إزالة القيد الفريد من archive_number في جدول declarations
-- حيث أن رقم الأرشيف الآن يمكن أن يكون متكرراً لأنه يمثل ملف أرشيف واحد يحتوي على عدة إقرارات

-- إزالة القيد الفريد إذا كان موجوداً
ALTER TABLE public.declarations 
DROP CONSTRAINT IF EXISTS unique_archive_number;

-- إزالة أي فهرس فريد على archive_number إذا كان موجوداً
DROP INDEX IF EXISTS declarations_archive_number_key;

-- التعليق على الحقل لتوضيح الاستخدام الجديد
COMMENT ON COLUMN public.declarations.archive_number IS 'رقم الأرشيف القديم (deprecated). استخدم archive_file_id بدلاً منه';