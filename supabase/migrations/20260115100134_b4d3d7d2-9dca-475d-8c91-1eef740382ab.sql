-- Fix petty_cash_expenses RLS: Currently allows all authenticated users to view all records
-- Should restrict so users can only see their own expenses, admins/managers can see all

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all petty cash expenses" ON public.petty_cash_expenses;

-- Create proper RLS policies for SELECT
CREATE POLICY "Users can view own petty cash expenses"
ON public.petty_cash_expenses FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Admins and managers can view all petty cash expenses"
ON public.petty_cash_expenses FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Block anonymous access
CREATE POLICY "Block anonymous access to petty_cash_expenses"
ON public.petty_cash_expenses FOR SELECT
USING (false);

-- Fix cost_centers RLS: Currently allows anyone (including anonymous) to view
-- Should restrict to authenticated users only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view cost centers" ON public.cost_centers;

-- Create policy for authenticated users only
CREATE POLICY "Authenticated users can view cost centers"
ON public.cost_centers FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Block anonymous access
CREATE POLICY "Block anonymous access to cost_centers"
ON public.cost_centers FOR SELECT
USING (false);