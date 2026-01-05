-- Fix PUBLIC_DATA_EXPOSURE: Replace overly permissive SELECT policy on leave_requests
-- This restricts access so users can only view their own requests unless they are admin/manager

-- Drop the policies that may have been partially created
DROP POLICY IF EXISTS "Users can view own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "HR and admins can view all leave requests" ON leave_requests;

-- Create policy for users to view their own leave requests
CREATE POLICY "Users can view own leave requests"
  ON leave_requests FOR SELECT
  USING (auth.uid() = created_by);

-- Create policy for admin/manager to view all leave requests  
CREATE POLICY "Admins and managers can view all leave requests"
  ON leave_requests FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role)
  );