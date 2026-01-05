-- Fix PUBLIC_DATA_EXPOSURE: Drop the overly permissive SELECT policy on leave_requests
-- This policy allows ALL authenticated users to view ALL leave requests (USING true)
DROP POLICY IF EXISTS "Users can view all leave requests" ON leave_requests;