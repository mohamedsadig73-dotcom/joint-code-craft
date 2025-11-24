-- Comprehensive security fixes: Add missing RLS policies and fix remaining recursion risks

-- ============================================
-- Priority 1: Fix user_roles table policies
-- ============================================
-- Add missing INSERT, UPDATE, DELETE policies for admin role management

CREATE POLICY "Admins can assign roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- Priority 2: Fix remaining infinite recursion risks
-- ============================================
-- Replace EXISTS queries with has_role() function

-- Fix profiles policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix declaration_status_history policy
DROP POLICY IF EXISTS "Admins and managers can view all history" ON public.declaration_status_history;
CREATE POLICY "Admins and managers can view all history"
ON public.declaration_status_history FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

-- ============================================
-- Priority 3: Complete declaration_status_history policies
-- ============================================
-- Add UPDATE policy for users to correct recent mistakes
CREATE POLICY "Users can update own recent history"
ON public.declaration_status_history FOR UPDATE
TO authenticated
USING (
  auth.uid() = changed_by AND
  changed_at > now() - interval '1 hour'
);

-- Add DELETE policy for admins to clean up erroneous entries
CREATE POLICY "Admins can delete history entries"
ON public.declaration_status_history FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));