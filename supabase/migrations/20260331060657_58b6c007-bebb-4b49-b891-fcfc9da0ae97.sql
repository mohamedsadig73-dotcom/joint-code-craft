-- Recreate audit_logs INSERT policy: users can only log as themselves
CREATE POLICY "Users can only insert own audit logs"
ON audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Recreate rate_limit_tracking INSERT policy
CREATE POLICY "Users can only insert own rate limits"
ON rate_limit_tracking FOR INSERT TO authenticated
WITH CHECK (identifier = auth.uid()::text);