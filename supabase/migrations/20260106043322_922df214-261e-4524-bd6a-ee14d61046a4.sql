-- Fix log_audit_event function to handle NULL auth.uid()
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
  _user_id UUID;
BEGIN
  -- Get user ID with fallback for system operations
  _user_id := COALESCE(
    auth.uid(),
    '00000000-0000-0000-0000-000000000000'::UUID  -- System user
  );
  
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    _user_id,
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

-- Fix log_declaration_status_change to handle NULL auth.uid()
CREATE OR REPLACE FUNCTION public.log_declaration_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Try auth.uid() first, fallback to system user
    _user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID);
    
    INSERT INTO public.declaration_status_history (
      declaration_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      _user_id
    );
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.declaration_status_history (
      declaration_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      NULL,
      NEW.status,
      NEW.sender_id  -- Use sender_id for initial creation
    );
  END IF;
  
  RETURN NEW;
END;
$$;