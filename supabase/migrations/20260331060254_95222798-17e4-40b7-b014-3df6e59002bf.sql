-- Clean up remaining permissive policies that were supposed to be dropped
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert rate limits" ON rate_limit_tracking;