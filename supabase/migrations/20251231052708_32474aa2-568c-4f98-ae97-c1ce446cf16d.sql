-- Create petty cash expenses table
CREATE TABLE public.petty_cash_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  vendor_name TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  cost_center TEXT NOT NULL,
  item_name TEXT,
  recipient TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.petty_cash_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all petty cash expenses"
ON public.petty_cash_expenses
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create expenses"
ON public.petty_cash_expenses
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own expenses or admins can update any"
ON public.petty_cash_expenses
FOR UPDATE
USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Admins can delete expenses"
ON public.petty_cash_expenses
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_petty_cash_expenses_updated_at
BEFORE UPDATE ON public.petty_cash_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create cost centers reference table
CREATE TABLE public.cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for cost centers
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cost centers"
ON public.cost_centers FOR SELECT USING (true);

CREATE POLICY "Admins can manage cost centers"
ON public.cost_centers FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Insert default cost centers
INSERT INTO public.cost_centers (name, name_ar) VALUES
('Administrative Office', 'المكتب الإداري'),
('Warehouse', 'المخزن'),
('Operations', 'التشغيل'),
('Maintenance', 'الصيانة'),
('Transportation', 'النقل'),
('Catering', 'التموين'),
('Cleaning', 'النظافة'),
('Other', 'أخرى');