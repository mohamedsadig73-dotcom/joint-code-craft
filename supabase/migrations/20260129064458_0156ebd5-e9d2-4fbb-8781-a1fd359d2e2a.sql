-- Add is_active field to profiles for soft delete
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for faster filtering of active users
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Create function to check if user has linked data
CREATE OR REPLACE FUNCTION public.check_user_has_linked_data(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  declarations_count integer := 0;
  audit_logs_count integer := 0;
  status_history_count integer := 0;
  maintenance_count integer := 0;
  petty_cash_count integer := 0;
  leave_requests_count integer := 0;
  result jsonb;
BEGIN
  -- Count declarations created by user
  SELECT COUNT(*) INTO declarations_count 
  FROM public.declarations 
  WHERE sender_id = target_user_id;

  -- Count audit logs
  SELECT COUNT(*) INTO audit_logs_count 
  FROM public.audit_logs 
  WHERE user_id = target_user_id;

  -- Count status history changes
  SELECT COUNT(*) INTO status_history_count 
  FROM public.declaration_status_history 
  WHERE changed_by = target_user_id;

  -- Count maintenance items created
  SELECT COUNT(*) INTO maintenance_count 
  FROM public.maintenance_items 
  WHERE created_by = target_user_id;

  -- Count petty cash expenses
  SELECT COUNT(*) INTO petty_cash_count 
  FROM public.petty_cash_expenses 
  WHERE created_by = target_user_id;

  -- Count leave requests
  SELECT COUNT(*) INTO leave_requests_count 
  FROM public.leave_requests 
  WHERE created_by = target_user_id;

  result := jsonb_build_object(
    'has_data', (declarations_count + audit_logs_count + status_history_count + maintenance_count + petty_cash_count + leave_requests_count) > 0,
    'declarations', declarations_count,
    'audit_logs', audit_logs_count,
    'status_history', status_history_count,
    'maintenance', maintenance_count,
    'petty_cash', petty_cash_count,
    'leave_requests', leave_requests_count
  );

  RETURN result;
END;
$$;

-- Create function to deactivate user (soft delete)
CREATE OR REPLACE FUNCTION public.deactivate_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can deactivate users
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can deactivate users';
  END IF;

  -- Cannot deactivate yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot deactivate your own account';
  END IF;

  -- Update user status
  UPDATE public.profiles
  SET is_active = false
  WHERE id = target_user_id;

  -- Log the action
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (
    auth.uid(),
    'DEACTIVATE_USER',
    'profiles',
    target_user_id::text,
    jsonb_build_object('is_active', false, 'deactivated_by', auth.uid(), 'deactivated_at', now())
  );

  RETURN true;
END;
$$;

-- Create function to reactivate user
CREATE OR REPLACE FUNCTION public.reactivate_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can reactivate users
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reactivate users';
  END IF;

  -- Update user status
  UPDATE public.profiles
  SET is_active = true
  WHERE id = target_user_id;

  -- Log the action
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (
    auth.uid(),
    'REACTIVATE_USER',
    'profiles',
    target_user_id::text,
    jsonb_build_object('is_active', true, 'reactivated_by', auth.uid(), 'reactivated_at', now())
  );

  RETURN true;
END;
$$;

-- Create function to hard delete user (only if no linked data)
CREATE OR REPLACE FUNCTION public.hard_delete_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  linked_data jsonb;
  target_username text;
  target_email text;
BEGIN
  -- Only admins can delete users
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Cannot delete yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Get target user info
  SELECT username, email INTO target_username, target_email
  FROM public.profiles WHERE id = target_user_id;

  -- Check for linked data
  linked_data := check_user_has_linked_data(target_user_id);

  IF (linked_data->>'has_data')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'USER_HAS_LINKED_DATA',
      'linked_data', linked_data
    );
  END IF;

  -- Delete user roles first
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Log the action
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
  VALUES (
    auth.uid(),
    'DELETE_USER',
    'profiles',
    target_user_id::text,
    jsonb_build_object('username', target_username, 'email', target_email, 'deleted_at', now())
  );

  RETURN jsonb_build_object('success', true);
END;
$$;