-- Create RMA (Return Merchandise Authorization) table
CREATE TABLE public.wms_rma (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rma_number TEXT NOT NULL UNIQUE,
  order_type TEXT NOT NULL CHECK (order_type IN ('inbound', 'outbound')),
  original_order_id UUID,
  customer_name TEXT,
  supplier_id UUID REFERENCES public.wms_suppliers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'inspecting', 'completed', 'rejected', 'refunded')),
  reason TEXT NOT NULL,
  reason_category TEXT CHECK (reason_category IN ('defective', 'damaged', 'wrong_item', 'quality_issue', 'customer_return', 'excess_inventory', 'other')),
  requested_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_date TIMESTAMP WITH TIME ZONE,
  received_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  received_by UUID,
  notes TEXT,
  refund_amount NUMERIC,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create RMA lines table
CREATE TABLE public.wms_rma_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rma_id UUID NOT NULL REFERENCES public.wms_rma(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.wms_products(id),
  quantity NUMERIC NOT NULL,
  received_quantity NUMERIC DEFAULT 0,
  condition TEXT CHECK (condition IN ('good', 'damaged', 'defective', 'expired', 'pending_inspection')),
  disposition TEXT CHECK (disposition IN ('restock', 'repair', 'scrap', 'return_to_supplier', 'pending')),
  location_id UUID REFERENCES public.wms_locations(id),
  lot_number TEXT,
  serial_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Cross-Docking table
CREATE TABLE public.wms_cross_dock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cross_dock_number TEXT NOT NULL UNIQUE,
  inbound_order_id UUID REFERENCES public.wms_inbound_orders(id),
  outbound_order_id UUID REFERENCES public.wms_outbound_orders(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  dock_location_id UUID REFERENCES public.wms_locations(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Cross-Docking lines table
CREATE TABLE public.wms_cross_dock_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cross_dock_id UUID NOT NULL REFERENCES public.wms_cross_dock(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.wms_products(id),
  inbound_line_id UUID REFERENCES public.wms_inbound_lines(id),
  outbound_line_id UUID REFERENCES public.wms_outbound_lines(id),
  quantity NUMERIC NOT NULL,
  transferred_quantity NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'transferring', 'completed')),
  lot_number TEXT,
  serial_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add picking strategy to products
ALTER TABLE public.wms_products
ADD COLUMN IF NOT EXISTS picking_strategy TEXT DEFAULT 'FIFO' CHECK (picking_strategy IN ('FIFO', 'FEFO', 'LIFO'));

-- Create serial number tracking table
CREATE TABLE public.wms_serial_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES public.wms_products(id),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'returned', 'scrapped')),
  location_id UUID REFERENCES public.wms_locations(id),
  lot_number TEXT,
  received_date DATE,
  expiry_date DATE,
  inbound_order_id UUID,
  outbound_order_id UUID,
  rma_id UUID,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.wms_rma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_rma_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_cross_dock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_cross_dock_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_serial_numbers ENABLE ROW LEVEL SECURITY;

-- RLS policies for wms_rma
CREATE POLICY "Users can view RMA" ON public.wms_rma FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can manage RMA" ON public.wms_rma FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS policies for wms_rma_lines
CREATE POLICY "Users can view RMA lines" ON public.wms_rma_lines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can manage RMA lines" ON public.wms_rma_lines FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS policies for wms_cross_dock
CREATE POLICY "Users can view cross dock" ON public.wms_cross_dock FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can manage cross dock" ON public.wms_cross_dock FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS policies for wms_cross_dock_lines
CREATE POLICY "Users can view cross dock lines" ON public.wms_cross_dock_lines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can manage cross dock lines" ON public.wms_cross_dock_lines FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS policies for wms_serial_numbers
CREATE POLICY "Users can view serial numbers" ON public.wms_serial_numbers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can manage serial numbers" ON public.wms_serial_numbers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));