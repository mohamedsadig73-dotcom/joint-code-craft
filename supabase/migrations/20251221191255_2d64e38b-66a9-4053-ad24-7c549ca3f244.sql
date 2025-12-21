-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Employee Information
  employee_name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  hire_date DATE NOT NULL,
  original_balance INTEGER NOT NULL DEFAULT 21,
  current_remaining_balance INTEGER NOT NULL,
  
  -- Request Details
  start_date_gregorian DATE NOT NULL,
  start_date_hijri TEXT,
  end_date_gregorian DATE NOT NULL,
  end_date_hijri TEXT,
  days_requested INTEGER NOT NULL,
  expected_return_date DATE NOT NULL,
  
  -- Optional Reason
  reason TEXT,
  
  -- Substitute/Deputy
  deputy_name TEXT,
  deputy_department TEXT,
  deputy_contact TEXT,
  
  -- Approvals
  employee_signature_date DATE,
  manager_approved BOOLEAN DEFAULT NULL,
  manager_notes TEXT,
  manager_approved_date DATE,
  manager_approved_by UUID REFERENCES public.profiles(id),
  hr_approved BOOLEAN DEFAULT NULL,
  hr_notes TEXT,
  hr_approved_date DATE,
  hr_approved_by UUID REFERENCES public.profiles(id),
  
  -- Calculated Fields
  previously_used_days INTEGER NOT NULL DEFAULT 0,
  expected_remaining_balance INTEGER GENERATED ALWAYS AS (original_balance - previously_used_days - days_requested) STORED,
  months_of_service INTEGER,
  request_status TEXT DEFAULT 'pending',
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own pending requests"
ON public.leave_requests
FOR UPDATE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- Create function to calculate request status
CREATE OR REPLACE FUNCTION public.calculate_leave_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_months_of_service INTEGER;
  v_expected_remaining INTEGER;
BEGIN
  -- Calculate months of service
  v_months_of_service := EXTRACT(YEAR FROM age(CURRENT_DATE, NEW.hire_date)) * 12 + 
                         EXTRACT(MONTH FROM age(CURRENT_DATE, NEW.hire_date));
  
  -- Calculate expected remaining balance
  v_expected_remaining := NEW.original_balance - NEW.previously_used_days - NEW.days_requested;
  
  -- Set months of service
  NEW.months_of_service := v_months_of_service;
  
  -- Determine status based on rules
  IF v_months_of_service < 6 THEN
    NEW.request_status := 'rejected_less_than_6_months';
  ELSIF v_expected_remaining < 5 THEN
    NEW.request_status := 'rejected_insufficient_balance';
  ELSE
    NEW.request_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER calculate_leave_status_trigger
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.calculate_leave_request_status();

-- Create trigger for updated_at
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();