
-- Add start_date and end_date columns to petty_cash_periods
ALTER TABLE petty_cash_periods 
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- Set start_date from opened_at and end_date from closed_at for existing periods
UPDATE petty_cash_periods SET start_date = opened_at::date WHERE start_date IS NULL;
UPDATE petty_cash_periods SET end_date = closed_at::date WHERE closed_at IS NOT NULL AND end_date IS NULL;

-- Create a function to validate expense date falls within its period's date range
CREATE OR REPLACE FUNCTION validate_expense_period_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_start date;
  period_end date;
  period_status text;
BEGIN
  -- Skip if no period_id
  IF NEW.period_id IS NULL THEN
    RAISE EXCEPTION 'المصروف يجب أن يكون مرتبطاً بفترة نثرية (Expense must be linked to a period)';
  END IF;

  -- Get period info
  SELECT p.start_date, p.end_date, p.status::text
  INTO period_start, period_end, period_status
  FROM petty_cash_periods p
  WHERE p.id = NEW.period_id;

  -- Validate expense_date is not before period start_date
  IF period_start IS NOT NULL AND NEW.expense_date < period_start THEN
    RAISE EXCEPTION 'تاريخ المصروف (%) قبل تاريخ بداية الفترة (%) - Expense date is before period start date', 
      NEW.expense_date, period_start;
  END IF;

  -- Validate expense_date is not after period end_date (only for closed periods)
  IF period_end IS NOT NULL AND NEW.expense_date > period_end THEN
    RAISE EXCEPTION 'تاريخ المصروف (%) بعد تاريخ نهاية الفترة (%) - Expense date is after period end date', 
      NEW.expense_date, period_end;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_validate_expense_period_date ON petty_cash_expenses;
CREATE TRIGGER trg_validate_expense_period_date
  BEFORE INSERT OR UPDATE ON petty_cash_expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_expense_period_date();
