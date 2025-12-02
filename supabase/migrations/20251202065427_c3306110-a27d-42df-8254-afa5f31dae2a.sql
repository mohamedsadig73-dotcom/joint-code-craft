-- إنشاء جدول لتتبع Rate Limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address أو user_id
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_endpoint 
ON public.rate_limit_tracking(identifier, endpoint, window_start);

-- إنشاء جدول ملفات الأرشيف
CREATE TABLE IF NOT EXISTS public.archive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_number TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_files ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لجدول rate_limit_tracking (للنظام فقط)
CREATE POLICY "System can manage rate limits"
ON public.rate_limit_tracking
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- سياسات RLS لجدول archive_files
CREATE POLICY "Admins and managers can view all archive files"
ON public.archive_files
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can manage archive files"
ON public.archive_files
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- إضافة عمود archive_file_id إلى جدول declarations
ALTER TABLE public.declarations 
ADD COLUMN IF NOT EXISTS archive_file_id UUID REFERENCES public.archive_files(id) ON DELETE SET NULL;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_declarations_archive_file 
ON public.declarations(archive_file_id);

-- دالة لتسجيل محاولات الدخول الفاشلة
CREATE OR REPLACE FUNCTION public.log_failed_login_attempt(
  _email TEXT,
  _error_message TEXT,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
  _user_id UUID;
BEGIN
  -- محاولة الحصول على user_id من البريد الإلكتروني
  SELECT id INTO _user_id 
  FROM public.profiles 
  WHERE email = _email 
  LIMIT 1;

  -- تسجيل المحاولة الفاشلة
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    'FAILED_LOGIN',
    'auth.users',
    _email,
    NULL,
    jsonb_build_object(
      'email', _email,
      'error', _error_message,
      'timestamp', NOW()
    ),
    _ip_address,
    _user_agent
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Trigger لتحديث updated_at في archive_files
CREATE OR REPLACE TRIGGER update_archive_files_updated_at
BEFORE UPDATE ON public.archive_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- دالة لتنظيف سجلات rate limiting القديمة (أقدم من ساعة)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_tracking
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;