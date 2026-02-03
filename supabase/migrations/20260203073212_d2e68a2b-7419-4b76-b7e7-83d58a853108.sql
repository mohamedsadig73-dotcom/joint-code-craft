
-- Create enum for petty cash period status
CREATE TYPE public.petty_cash_status AS ENUM ('open', 'closed', 'pending_approval', 'rejected');

-- Create petty cash periods table
CREATE TABLE public.petty_cash_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_number TEXT NOT NULL,
  location TEXT NOT NULL,
  responsible_person TEXT NOT NULL,
  budget_limit NUMERIC NOT NULL DEFAULT 1000,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  total_expenses NUMERIC NOT NULL DEFAULT 0,
  expenses_count INTEGER NOT NULL DEFAULT 0,
  status public.petty_cash_status NOT NULL DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opened_by UUID REFERENCES public.profiles(id),
  closed_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add period_id to petty_cash_expenses
ALTER TABLE public.petty_cash_expenses 
ADD COLUMN period_id UUID REFERENCES public.petty_cash_periods(id);

-- Enable RLS
ALTER TABLE public.petty_cash_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for petty_cash_periods
CREATE POLICY "Admins and managers can view all periods"
ON public.petty_cash_periods
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can manage periods"
ON public.petty_cash_periods
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view own created periods"
ON public.petty_cash_periods
FOR SELECT
USING (opened_by = auth.uid());

CREATE POLICY "Block anonymous access to petty_cash_periods"
ON public.petty_cash_periods
FOR SELECT
USING (false);

-- Function to generate period number
CREATE OR REPLACE FUNCTION public.generate_petty_cash_period_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
  current_year TEXT;
  seq_number INT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(period_number FROM 4)
      AS INTEGER
    )
  ), 0) + 1
  INTO seq_number
  FROM petty_cash_periods
  WHERE period_number LIKE 'PC-' || current_year || '%';
  
  new_number := 'PC-' || current_year || '-' || LPAD(seq_number::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;

-- Function to update period totals when expense is added/updated/deleted
CREATE OR REPLACE FUNCTION public.update_period_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period_id UUID;
  v_total NUMERIC;
  v_count INTEGER;
  v_opening NUMERIC;
BEGIN
  -- Determine which period to update
  IF TG_OP = 'DELETE' THEN
    v_period_id := OLD.period_id;
  ELSE
    v_period_id := NEW.period_id;
  END IF;
  
  -- Skip if no period linked
  IF v_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calculate totals
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
  INTO v_total, v_count
  FROM petty_cash_expenses
  WHERE period_id = v_period_id;
  
  -- Get opening balance
  SELECT opening_balance INTO v_opening
  FROM petty_cash_periods
  WHERE id = v_period_id;
  
  -- Update period
  UPDATE petty_cash_periods
  SET 
    total_expenses = v_total,
    expenses_count = v_count,
    current_balance = COALESCE(v_opening, 0) - v_total,
    updated_at = now()
  WHERE id = v_period_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for updating period totals
CREATE TRIGGER update_period_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.petty_cash_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_period_totals();

-- Add updated_at trigger for periods
CREATE TRIGGER update_petty_cash_periods_updated_at
BEFORE UPDATE ON public.petty_cash_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
