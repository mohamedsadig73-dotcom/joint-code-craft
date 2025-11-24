-- إضافة حقول جديدة لجدول الإقرارات
ALTER TABLE public.declarations 
ADD COLUMN IF NOT EXISTS archive_number TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- إنشاء فهرس للبحث السريع برقم الأرشيف
CREATE INDEX IF NOT EXISTS idx_declarations_archive_number 
ON public.declarations(archive_number) 
WHERE archive_number IS NOT NULL;

-- إضافة قيد فريد لرقم الأرشيف لمنع التكرار
ALTER TABLE public.declarations 
ADD CONSTRAINT unique_archive_number 
UNIQUE (archive_number);

-- تحديث جدول profiles لإضافة الهاتف والصورة الشخصية
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- دالة لتوليد رقم أرشيف تلقائي
CREATE OR REPLACE FUNCTION public.generate_archive_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  next_number INT;
  new_archive_number TEXT;
BEGIN
  -- الحصول على السنة الحالية
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- الحصول على آخر رقم أرشيف في السنة الحالية
  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(
          archive_number, 
          'AR-' || current_year || '-', 
          ''
        ) AS INTEGER
      )
    ), 
    0
  ) + 1
  INTO next_number
  FROM public.declarations
  WHERE archive_number LIKE 'AR-' || current_year || '-%';
  
  -- إنشاء رقم الأرشيف الجديد
  new_archive_number := 'AR-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN new_archive_number;
END;
$$;

-- دالة لإرسال إشعار تلقائي بعد 7 أيام
CREATE OR REPLACE FUNCTION public.check_admin_office_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- إرسال إشعارات للإقرارات التي مر عليها 7 أيام في المكتب الإداري
  INSERT INTO public.notifications (
    user_id,
    declaration_id,
    title,
    message,
    type
  )
  SELECT 
    d.sender_id,
    d.id,
    'تنبيه: مرور 7 أيام على الإقرار',
    'لقد مر 7 أيام على إرسال الإقرار ' || d.id || ' إلى المكتب الإداري. يرجى المتابعة.',
    'warning'
  FROM public.declarations d
  WHERE d.status = 'sent_to_admin_office'
    AND d.updated_at < NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 
      FROM public.notifications n 
      WHERE n.declaration_id = d.id 
        AND n.type = 'warning'
        AND n.created_at > NOW() - INTERVAL '7 days'
    );
END;
$$;