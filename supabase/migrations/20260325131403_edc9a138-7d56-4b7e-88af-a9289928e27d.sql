-- Fix 1: Restrict rate_limit_tracking INSERT to authenticated users only
DROP POLICY IF EXISTS "System can insert rate limits" ON rate_limit_tracking;
CREATE POLICY "System can insert rate limits"
ON rate_limit_tracking FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix 2: Add input validation to log_failed_login_attempt
CREATE OR REPLACE FUNCTION public.log_failed_login_attempt(
  _email VARCHAR(254),
  _error_message VARCHAR(1000),
  _ip_address VARCHAR(45) DEFAULT NULL,
  _user_agent VARCHAR(500) DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempt_count INTEGER;
  _sanitized_email TEXT;
  _sanitized_ip TEXT;
  _sanitized_ua TEXT;
  _sanitized_error TEXT;
BEGIN
  -- Validate email format
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Sanitize inputs: strip control characters
  _sanitized_email := regexp_replace(LEFT(TRIM(_email), 254), E'[\\x00-\\x1F\\x7F]', '', 'g');
  _sanitized_ip := regexp_replace(LEFT(COALESCE(TRIM(_ip_address), ''), 45), E'[\\x00-\\x1F\\x7F]', '', 'g');
  _sanitized_ua := regexp_replace(LEFT(COALESCE(TRIM(_user_agent), ''), 500), E'[\\x00-\\x1F\\x7F]', '', 'g');
  _sanitized_error := regexp_replace(LEFT(COALESCE(TRIM(_error_message), ''), 1000), E'[\\x00-\\x1F\\x7F]', '', 'g');

  -- Rate limiting: max 10 attempts per hour per email
  SELECT COUNT(*) INTO _attempt_count
  FROM audit_logs
  WHERE table_name = 'auth'
    AND action = 'FAILED_LOGIN'
    AND new_values->>'email' = _sanitized_email
    AND created_at > NOW() - INTERVAL '1 hour';

  IF _attempt_count >= 10 THEN
    RAISE EXCEPTION 'Too many failed login attempts. Please try again later.';
  END IF;

  INSERT INTO audit_logs (
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
    NULL,
    jsonb_build_object(
      'email', _sanitized_email,
      'error', _sanitized_error,
      'timestamp', NOW()
    ),
    NULLIF(_sanitized_ip, ''),
    NULLIF(_sanitized_ua, '')
  );
END;
$$;