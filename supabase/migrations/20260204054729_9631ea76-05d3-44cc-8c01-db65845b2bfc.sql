-- Add balance disposition tracking to periods
ALTER TABLE petty_cash_periods 
ADD COLUMN IF NOT EXISTS balance_disposition TEXT CHECK (
  balance_disposition IN ('carried_forward', 'refunded', 'written_off')
),
ADD COLUMN IF NOT EXISTS disposition_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS disposition_reference TEXT,
ADD COLUMN IF NOT EXISTS carried_from_period_id UUID REFERENCES petty_cash_periods(id);

-- Create transactions table for audit trail
CREATE TABLE IF NOT EXISTS petty_cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES petty_cash_periods(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('opening', 'expense', 'carry_forward_out', 'carry_forward_in', 'refund', 'write_off')
  ),
  amount NUMERIC NOT NULL,
  from_period_id UUID REFERENCES petty_cash_periods(id),
  to_period_id UUID REFERENCES petty_cash_periods(id),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE petty_cash_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view all transactions"
ON petty_cash_transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert transactions"
ON petty_cash_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Block closure if balance exists without disposition
CREATE OR REPLACE FUNCTION check_balance_disposition_before_closure()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check when moving to pending_approval
  IF NEW.status = 'pending_approval' AND OLD.status = 'open' THEN
    -- If there's a remaining balance, disposition must be set
    IF NEW.current_balance > 0 AND NEW.balance_disposition IS NULL THEN
      RAISE EXCEPTION 'Cannot close period: remaining balance of % requires disposition (carry_forward, refund, or write_off)', NEW.current_balance;
    END IF;
    
    -- If disposition is set, amount must match
    IF NEW.balance_disposition IS NOT NULL AND NEW.disposition_amount != NEW.current_balance THEN
      RAISE EXCEPTION 'Disposition amount must match remaining balance';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS check_balance_disposition_trigger ON petty_cash_periods;
CREATE TRIGGER check_balance_disposition_trigger
BEFORE UPDATE ON petty_cash_periods
FOR EACH ROW
EXECUTE FUNCTION check_balance_disposition_before_closure();

-- Function to handle carry forward when opening new period
CREATE OR REPLACE FUNCTION handle_period_carry_forward()
RETURNS TRIGGER AS $$
DECLARE
  v_carried_amount NUMERIC;
  v_from_period_number TEXT;
BEGIN
  -- If this period has a carry-forward from another period
  IF NEW.carried_from_period_id IS NOT NULL THEN
    -- Get the amount and verify source period
    SELECT current_balance, period_number INTO v_carried_amount, v_from_period_number
    FROM petty_cash_periods
    WHERE id = NEW.carried_from_period_id
      AND status IN ('pending_approval', 'closed')
      AND balance_disposition = 'carried_forward';
    
    IF v_carried_amount IS NULL THEN
      RAISE EXCEPTION 'Invalid carry forward: source period not found or not eligible';
    END IF;
    
    -- Record the carry-forward transaction in the new period
    INSERT INTO petty_cash_transactions (
      period_id, transaction_type, amount, from_period_id, 
      notes, created_by
    ) VALUES (
      NEW.id, 'carry_forward_in', v_carried_amount, NEW.carried_from_period_id,
      'ترحيل من النثرية رقم ' || v_from_period_number, NEW.opened_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS handle_period_carry_forward_trigger ON petty_cash_periods;
CREATE TRIGGER handle_period_carry_forward_trigger
AFTER INSERT ON petty_cash_periods
FOR EACH ROW
EXECUTE FUNCTION handle_period_carry_forward();