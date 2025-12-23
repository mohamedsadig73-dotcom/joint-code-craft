-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create leave_tracking table for annual leave tracking
CREATE TABLE public.leave_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Employee Information
  employee_name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('employee', 'worker')),
  hire_date DATE NOT NULL,
  
  -- Leave Information
  last_leave_start DATE,
  last_leave_end DATE,
  current_leave_start DATE,
  current_leave_end DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  
  -- Balance
  entitled_days INTEGER NOT NULL DEFAULT 30,
  used_days INTEGER NOT NULL DEFAULT 0,
  remaining_balance INTEGER GENERATED ALWAYS AS (entitled_days - used_days) STORED,
  
  -- Next Leave (auto-calculated in app based on contract_type)
  next_leave_due DATE,
  
  -- Travel Info
  travel_date DATE,
  travel_destination TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable Row Level Security
ALTER TABLE public.leave_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view all leave tracking" 
ON public.leave_tracking 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert leave tracking" 
ON public.leave_tracking 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update leave tracking" 
ON public.leave_tracking 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete leave tracking" 
ON public.leave_tracking 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leave_tracking_updated_at
BEFORE UPDATE ON public.leave_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_tracking;