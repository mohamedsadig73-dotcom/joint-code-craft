
-- Fix search_path security warning
CREATE OR REPLACE FUNCTION validate_expense_period_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start date;
  period_end date;
  period_status text;
BEGIN
  IF NEW.period_id IS NULL THEN
    RAISE EXCEPTION 'المصروف يجب أن يكون مرتبطاً بفترة نثرية (Expense must be linked to a period)';
  END IF;

  SELECT p.start_date, p.end_date, p.status::text
  INTO period_start, period_end, period_status
  FROM petty_cash_periods p
  WHERE p.id = NEW.period_id;

  IF period_start IS NOT NULL AND NEW.expense_date < period_start THEN
    RAISE EXCEPTION 'تاريخ المصروف (%) قبل تاريخ بداية الفترة (%) - Expense date is before period start date', 
      NEW.expense_date, period_start;
  END IF;

  IF period_end IS NOT NULL AND NEW.expense_date > period_end THEN
    RAISE EXCEPTION 'تاريخ المصروف (%) بعد تاريخ نهاية الفترة (%) - Expense date is after period end date', 
      NEW.expense_date, period_end;
  END IF;

  RETURN NEW;
END;
$$;
