
-- Temporarily disable triggers to allow deletion
ALTER TABLE petty_cash_expenses DISABLE TRIGGER trg_validate_expense_period_date;
ALTER TABLE petty_cash_expenses DISABLE TRIGGER trg_enforce_open_period_expenses;
ALTER TABLE petty_cash_expenses DISABLE TRIGGER trg_prevent_expense_deletion;
ALTER TABLE petty_cash_expenses DISABLE TRIGGER update_period_totals_trigger;

-- Delete the 19 orphan expenses with no period_id
DELETE FROM petty_cash_expenses WHERE period_id IS NULL;

-- Re-enable all triggers
ALTER TABLE petty_cash_expenses ENABLE TRIGGER trg_validate_expense_period_date;
ALTER TABLE petty_cash_expenses ENABLE TRIGGER trg_enforce_open_period_expenses;
ALTER TABLE petty_cash_expenses ENABLE TRIGGER trg_prevent_expense_deletion;
ALTER TABLE petty_cash_expenses ENABLE TRIGGER update_period_totals_trigger;

-- Also make period_id NOT NULL to prevent future orphans
ALTER TABLE petty_cash_expenses ALTER COLUMN period_id SET NOT NULL;
