-- Fix leave_tracking RLS: Currently allows all authenticated users full access
-- This exposes sensitive employee data (hire dates, leave balances, travel info)

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view all leave tracking" ON public.leave_tracking;
DROP POLICY IF EXISTS "Authenticated users can insert leave tracking" ON public.leave_tracking;
DROP POLICY IF EXISTS "Authenticated users can update leave tracking" ON public.leave_tracking;
DROP POLICY IF EXISTS "Authenticated users can delete leave tracking" ON public.leave_tracking;

-- Create proper RLS policies matching the leave_requests security model

-- SELECT: Users can view their own records, admins/managers can view all
CREATE POLICY "Users can view own leave tracking"
ON public.leave_tracking FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Admins and managers can view all leave tracking"
ON public.leave_tracking FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Block anonymous access
CREATE POLICY "Block anonymous access to leave_tracking"
ON public.leave_tracking FOR SELECT
USING (false);

-- INSERT: Only admins and managers can create leave tracking records
CREATE POLICY "Admins and managers can insert leave tracking"
ON public.leave_tracking FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- UPDATE: Only admins and managers can update records
CREATE POLICY "Admins and managers can update leave tracking"
ON public.leave_tracking FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- DELETE: Only admins can delete records
CREATE POLICY "Admins can delete leave tracking"
ON public.leave_tracking FOR DELETE
USING (has_role(auth.uid(), 'admin'));