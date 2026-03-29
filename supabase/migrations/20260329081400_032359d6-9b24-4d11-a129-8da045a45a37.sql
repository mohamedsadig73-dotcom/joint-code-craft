
-- Fix 1: Restrict wms_transactions INSERT to admin/manager only
DROP POLICY IF EXISTS "Users can create transactions" ON public.wms_transactions;
CREATE POLICY "Admins and managers can create transactions"
ON public.wms_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- Fix 2: Add explicit authorization check to generate_maintenance_schedule
CREATE OR REPLACE FUNCTION public.generate_maintenance_schedule(
  _item_id UUID,
  _year INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item maintenance_items%ROWTYPE;
  v_start_date DATE;
  v_current_date DATE;
  v_end_date DATE;
  v_month INTEGER;
BEGIN
  -- Explicit authorization check (defense-in-depth)
  IF NOT (has_role(auth.uid(), 'admin'::app_role) 
       OR has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Admin or manager role required';
  END IF;

  SELECT * INTO v_item FROM maintenance_items WHERE id = _item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance item not found';
  END IF;

  -- Delete existing schedule for this item and year
  DELETE FROM maintenance_schedule 
  WHERE maintenance_item_id = _item_id AND year = _year;

  -- Determine start date
  IF EXTRACT(YEAR FROM v_item.start_date) = _year THEN
    v_start_date := v_item.start_date;
  ELSE
    v_start_date := make_date(_year, 1, 1);
  END IF;

  v_end_date := make_date(_year, 12, 31);
  v_current_date := v_start_date;

  -- Generate schedule based on frequency
  WHILE v_current_date <= v_end_date LOOP
    v_month := EXTRACT(MONTH FROM v_current_date);
    
    INSERT INTO maintenance_schedule (
      maintenance_item_id, year, month, scheduled_date, status
    ) VALUES (
      _item_id, _year, v_month, v_current_date, 'pending'
    );

    -- Advance date based on frequency
    CASE v_item.frequency
      WHEN 'daily' THEN v_current_date := v_current_date + INTERVAL '1 day';
      WHEN 'weekly' THEN v_current_date := v_current_date + INTERVAL '1 week';
      WHEN 'monthly' THEN v_current_date := v_current_date + INTERVAL '1 month';
      WHEN 'quarterly' THEN v_current_date := v_current_date + INTERVAL '3 months';
      WHEN 'semi_annual' THEN v_current_date := v_current_date + INTERVAL '6 months';
      WHEN 'annual' THEN v_current_date := v_current_date + INTERVAL '1 year';
      ELSE v_current_date := v_current_date + INTERVAL '1 month';
    END CASE;
  END LOOP;
END;
$$;
