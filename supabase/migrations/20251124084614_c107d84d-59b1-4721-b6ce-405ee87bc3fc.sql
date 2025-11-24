-- Fix RLS policy for declarations table UPDATE
-- The policy needs both USING and WITH CHECK clauses

DROP POLICY IF EXISTS "Admins and managers can update all declarations" ON public.declarations;

CREATE POLICY "Admins and managers can update all declarations"
ON public.declarations
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);