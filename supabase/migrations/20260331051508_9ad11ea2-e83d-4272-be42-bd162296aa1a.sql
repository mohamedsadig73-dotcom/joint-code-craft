
-- Temporarily disable triggers
ALTER TABLE petty_cash_expenses DISABLE TRIGGER trg_enforce_open_period_expenses;
ALTER TABLE petty_cash_expenses DISABLE TRIGGER update_period_totals_trigger;

-- Move the 2 expenses from PC-2026-0002 to PC-2026-0001
UPDATE petty_cash_expenses 
SET period_id = '12df0727-29c4-40a6-b08b-7304c991c58f' 
WHERE id IN ('f057a88a-9d85-427c-8a2b-fdcdfc7554e4', '697fc350-8a47-4e68-84c2-add9db68eb55');

-- Re-enable triggers
ALTER TABLE petty_cash_expenses ENABLE TRIGGER trg_enforce_open_period_expenses;
ALTER TABLE petty_cash_expenses ENABLE TRIGGER update_period_totals_trigger;

-- Recalculate PC-2026-0001
UPDATE petty_cash_periods 
SET total_expenses = (
  SELECT COALESCE(SUM(total_amount), 0) FROM petty_cash_expenses 
  WHERE period_id = '12df0727-29c4-40a6-b08b-7304c991c58f' AND status != 'rejected'
),
expenses_count = (
  SELECT COUNT(*) FROM petty_cash_expenses 
  WHERE period_id = '12df0727-29c4-40a6-b08b-7304c991c58f' AND status != 'rejected'
),
current_balance = opening_balance - (
  SELECT COALESCE(SUM(total_amount), 0) FROM petty_cash_expenses 
  WHERE period_id = '12df0727-29c4-40a6-b08b-7304c991c58f' AND status != 'rejected'
)
WHERE id = '12df0727-29c4-40a6-b08b-7304c991c58f';

-- Recalculate PC-2026-0002
UPDATE petty_cash_periods 
SET total_expenses = (
  SELECT COALESCE(SUM(total_amount), 0) FROM petty_cash_expenses 
  WHERE period_id = '9d393757-fde4-4e1c-a5c1-9c920efa1988' AND status != 'rejected'
),
expenses_count = (
  SELECT COUNT(*) FROM petty_cash_expenses 
  WHERE period_id = '9d393757-fde4-4e1c-a5c1-9c920efa1988' AND status != 'rejected'
),
current_balance = opening_balance - (
  SELECT COALESCE(SUM(total_amount), 0) FROM petty_cash_expenses 
  WHERE period_id = '9d393757-fde4-4e1c-a5c1-9c920efa1988' AND status != 'rejected'
)
WHERE id = '9d393757-fde4-4e1c-a5c1-9c920efa1988';
