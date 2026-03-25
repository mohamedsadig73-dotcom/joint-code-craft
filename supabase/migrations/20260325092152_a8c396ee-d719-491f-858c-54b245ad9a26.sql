
-- Holiday attendance sheets
CREATE TABLE public.holiday_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_name text NOT NULL,
  warehouse_number text NOT NULL,
  holiday_name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  month_year text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.holiday_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage holiday sheets"
ON public.holiday_sheets FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view holiday sheets"
ON public.holiday_sheets FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Holiday work records
CREATE TABLE public.holiday_work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES public.holiday_sheets(id) ON DELETE CASCADE,
  serial_number integer NOT NULL,
  work_type text NOT NULL,
  work_date text NOT NULL,
  employee_names text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.holiday_work_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage work records"
ON public.holiday_work_records FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view work records"
ON public.holiday_work_records FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Holiday employees
CREATE TABLE public.holiday_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES public.holiday_sheets(id) ON DELETE CASCADE,
  employee_number text NOT NULL,
  employee_name text NOT NULL,
  job_title text NOT NULL,
  total_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.holiday_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage holiday employees"
ON public.holiday_employees FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view holiday employees"
ON public.holiday_employees FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_holiday_sheets_updated_at
  BEFORE UPDATE ON public.holiday_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
