
-- Fix: Restrict audit_logs INSERT policy from public to authenticated only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);
