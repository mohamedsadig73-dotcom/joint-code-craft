-- إنشاء جدول audit_logs لتسجيل جميع العمليات المهمة
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- تفعيل RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- سياسة: المسؤولون فقط يمكنهم عرض السجلات
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة: النظام يمكنه إدراج السجلات
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- دالة لتسجيل العمليات تلقائياً
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _table_name TEXT,
  _record_id TEXT,
  _old_values JSONB DEFAULT NULL,
  _new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    _action,
    _table_name,
    _record_id,
    _old_values,
    _new_values
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Trigger لتسجيل التغييرات على جدول declarations
CREATE OR REPLACE FUNCTION public.audit_declarations_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_audit_event('CREATE', 'declarations', NEW.id, NULL, row_to_json(NEW)::jsonb);
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM log_audit_event('UPDATE', 'declarations', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM log_audit_event('DELETE', 'declarations', OLD.id, row_to_json(OLD)::jsonb, NULL);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_declarations_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.declarations
FOR EACH ROW EXECUTE FUNCTION public.audit_declarations_changes();

-- Trigger لتسجيل التغييرات على جدول user_roles
CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_audit_event('ASSIGN_ROLE', 'user_roles', NEW.user_id::text, NULL, row_to_json(NEW)::jsonb);
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM log_audit_event('UPDATE_ROLE', 'user_roles', NEW.user_id::text, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM log_audit_event('REMOVE_ROLE', 'user_roles', OLD.user_id::text, row_to_json(OLD)::jsonb, NULL);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_changes();

COMMENT ON TABLE public.audit_logs IS 'سجل تدقيق شامل لجميع العمليات المهمة في النظام';