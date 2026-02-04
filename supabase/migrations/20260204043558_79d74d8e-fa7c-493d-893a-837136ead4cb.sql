-- =====================================================
-- SAFEGUARD 1: Partial Unique Index - Only ONE Open Period
-- =====================================================
-- This ensures at database level that only one period can be 'open' at a time
-- No frontend bypass possible

CREATE UNIQUE INDEX idx_one_open_period 
ON public.petty_cash_periods (status) 
WHERE status = 'open';

-- =====================================================
-- SAFEGUARD 2: Trigger to Block Expenses on Non-Open Periods
-- =====================================================
-- Prevents inserting/updating expenses unless period is 'open'

CREATE OR REPLACE FUNCTION public.enforce_open_period_for_expenses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_status petty_cash_status;
BEGIN
  -- Skip if no period linked
  IF NEW.period_id IS NULL THEN
    RAISE EXCEPTION 'Expense must be linked to a petty cash period';
  END IF;
  
  -- Get period status
  SELECT status INTO v_period_status
  FROM petty_cash_periods
  WHERE id = NEW.period_id;
  
  -- Check if period exists
  IF v_period_status IS NULL THEN
    RAISE EXCEPTION 'Petty cash period not found';
  END IF;
  
  -- Only allow expenses on open periods
  IF v_period_status != 'open' THEN
    RAISE EXCEPTION 'Cannot add or modify expenses on a % period. Only open periods accept expenses.', v_period_status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_enforce_open_period_expenses ON public.petty_cash_expenses;
CREATE TRIGGER trg_enforce_open_period_expenses
  BEFORE INSERT OR UPDATE ON public.petty_cash_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_open_period_for_expenses();

-- =====================================================
-- SAFEGUARD 3: Prevent Deletion of Expenses on Closed Periods
-- =====================================================

CREATE OR REPLACE FUNCTION public.prevent_expense_deletion_on_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_status petty_cash_status;
BEGIN
  -- Get period status
  SELECT status INTO v_period_status
  FROM petty_cash_periods
  WHERE id = OLD.period_id;
  
  -- Block deletion if period is not open
  IF v_period_status IS NOT NULL AND v_period_status != 'open' THEN
    RAISE EXCEPTION 'Cannot delete expenses from a % period', v_period_status;
  END IF;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_expense_deletion ON public.petty_cash_expenses;
CREATE TRIGGER trg_prevent_expense_deletion
  BEFORE DELETE ON public.petty_cash_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_expense_deletion_on_closed();

-- =====================================================
-- SAFEGUARD 4: Validate Period Status Transitions
-- =====================================================
-- Enforces valid state machine: open → pending_approval → closed/rejected

CREATE OR REPLACE FUNCTION public.validate_period_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Define valid transitions
  -- open → pending_approval (closing)
  -- pending_approval → closed (approved)
  -- pending_approval → rejected (rejected)
  -- rejected → open (reopen for correction)
  
  IF OLD.status = 'open' AND NEW.status NOT IN ('pending_approval') THEN
    RAISE EXCEPTION 'Invalid transition: open periods can only move to pending_approval';
  END IF;
  
  IF OLD.status = 'pending_approval' AND NEW.status NOT IN ('closed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid transition: pending_approval can only move to closed or rejected';
  END IF;
  
  IF OLD.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot change status of a closed period';
  END IF;
  
  IF OLD.status = 'rejected' AND NEW.status != 'open' THEN
    RAISE EXCEPTION 'Rejected periods can only be reopened (set to open)';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_period_transition ON public.petty_cash_periods;
CREATE TRIGGER trg_validate_period_transition
  BEFORE UPDATE ON public.petty_cash_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_period_status_transition();

-- =====================================================
-- SAFEGUARD 5 (Optional): Block Closure if Unapproved Expenses
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_expenses_before_closure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  -- Only check when moving to pending_approval
  IF NEW.status = 'pending_approval' AND OLD.status = 'open' THEN
    SELECT COUNT(*) INTO v_pending_count
    FROM petty_cash_expenses
    WHERE period_id = NEW.id
      AND status = 'pending';
    
    IF v_pending_count > 0 THEN
      RAISE EXCEPTION 'Cannot close period: % expenses are still pending approval', v_pending_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_expenses_closure ON public.petty_cash_periods;
CREATE TRIGGER trg_check_expenses_closure
  BEFORE UPDATE ON public.petty_cash_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.check_expenses_before_closure();