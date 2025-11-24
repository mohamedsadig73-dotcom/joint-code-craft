-- تعديل دالة توليد رقم الأرشيف لتستخدم نظام S1, S2, S3...
DROP FUNCTION IF EXISTS public.generate_archive_number();

CREATE OR REPLACE FUNCTION public.generate_archive_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INT;
  new_archive_number TEXT;
BEGIN
  -- الحصول على آخر رقم أرشيف
  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(
          archive_number, 
          'S', 
          ''
        ) AS INTEGER
      )
    ), 
    0
  ) + 1
  INTO next_number
  FROM public.declarations
  WHERE archive_number LIKE 'S%'
    AND archive_number ~ '^S[0-9]+$';
  
  -- إنشاء رقم الأرشيف الجديد بصيغة S1, S2, S3...
  new_archive_number := 'S' || next_number::TEXT;
  
  RETURN new_archive_number;
END;
$$;

-- تحديث قيد التفرد ليسمح بإضافة أرقام جديدة
ALTER TABLE public.declarations 
DROP CONSTRAINT IF EXISTS unique_archive_number;

ALTER TABLE public.declarations 
ADD CONSTRAINT unique_archive_number 
UNIQUE (archive_number);

-- تحديث الأرقام الموجودة إذا كانت بالتنسيق القديم (اختياري)
-- يمكنك تشغيل هذا إذا كنت تريد تحويل الأرقام القديمة
-- UPDATE public.declarations 
-- SET archive_number = 'S' || ROW_NUMBER() OVER (ORDER BY created_at)
-- WHERE archive_number IS NOT NULL AND archive_number LIKE 'AR-%';