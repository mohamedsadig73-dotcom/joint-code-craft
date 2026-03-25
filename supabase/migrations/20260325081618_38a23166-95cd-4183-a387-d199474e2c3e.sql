
-- Fix 1: Remove overly permissive UPDATE policy on rate_limit_tracking
DROP POLICY IF EXISTS "System can update rate limits" ON rate_limit_tracking;

-- Fix 2: Add rate limiting to log_failed_login_attempt function
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
  _attempt_count INTEGER;
  _window_start TIMESTAMPTZ;
  _log_id UUID;
BEGIN
  _window_start := NOW() - INTERVAL '1 hour';
  
  -- Count recent failed attempts for this email
  SELECT COUNT(*) INTO _attempt_count
  FROM public.audit_logs
  WHERE action = 'FAILED_LOGIN'
    AND record_id = _email
    AND created_at >= _window_start;
  
  -- Block if too many attempts
  IF _attempt_count >= 10 THEN
    RAISE EXCEPTION 'Too many failed login attempts. Account temporarily locked. Try again in 1 hour.';
  END IF;
  
  -- Log the failed attempt
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'FAILED_LOGIN',
    'auth',
    _email,
    jsonb_build_object('error_message', _error_message, 'attempt_number', _attempt_count + 1),
    _ip_address,
    _user_agent
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;
