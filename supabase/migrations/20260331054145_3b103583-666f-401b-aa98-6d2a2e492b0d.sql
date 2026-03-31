
-- Fix 1: declaration_deletion_log - restrict INSERT to authenticated users with ownership check
DROP POLICY IF EXISTS "System can insert deletion logs" ON declaration_deletion_log;
CREATE POLICY "Authenticated users can insert own deletion logs"
  ON declaration_deletion_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = deleted_by);

-- Fix 2: master_employees - restrict SELECT to admins and managers only
DROP POLICY IF EXISTS "Authenticated users can view master employees" ON master_employees;
CREATE POLICY "Admins and managers can view master employees"
  ON master_employees FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Fix 3: petty_cash_transactions - restrict INSERT to admins and managers
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON petty_cash_transactions;
CREATE POLICY "Admins and managers can insert transactions"
  ON petty_cash_transactions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
