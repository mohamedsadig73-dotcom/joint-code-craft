-- Master employees table
CREATE TABLE public.master_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number text NOT NULL UNIQUE,
  employee_name text NOT NULL,
  job_title text NOT NULL DEFAULT 'عامل',
  department text DEFAULT NULL,
  phone text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.master_employees ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins and managers can manage master employees"
  ON public.master_employees FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can view master employees"
  ON public.master_employees FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Updated_at trigger
CREATE TRIGGER update_master_employees_updated_at
  BEFORE UPDATE ON public.master_employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed from existing data
INSERT INTO public.master_employees (employee_number, employee_name, job_title)
SELECT DISTINCT ON (employee_number) employee_number, employee_name, job_title
FROM public.holiday_employees
WHERE employee_number != '' AND employee_name != ''
ON CONFLICT (employee_number) DO NOTHING;

INSERT INTO public.master_employees (employee_number, employee_name, job_title)
SELECT DISTINCT ON (employee_id) employee_id, employee_name, job_title
FROM public.leave_tracking
WHERE employee_id != '' AND employee_name != ''
ON CONFLICT (employee_number) DO NOTHING;