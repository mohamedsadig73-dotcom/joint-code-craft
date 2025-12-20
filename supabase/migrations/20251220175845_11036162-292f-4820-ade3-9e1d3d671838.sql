-- 3PL Tenants Table
CREATE TABLE public.wms_3pl_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_code TEXT NOT NULL UNIQUE,
  tenant_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  contract_start DATE,
  contract_end DATE,
  storage_allocation NUMERIC(10,2) DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Billing/Invoices Table
CREATE TABLE public.wms_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.wms_3pl_tenants(id),
  customer_name TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Invoice Line Items
CREATE TABLE public.wms_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.wms_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- E-commerce Platforms Table
CREATE TABLE public.wms_ecommerce_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name TEXT NOT NULL,
  platform_type TEXT NOT NULL CHECK (platform_type IN ('shopify', 'woocommerce', 'magento', 'amazon', 'other')),
  api_url TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle',
  orders_pending INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- E-commerce Orders Sync
CREATE TABLE public.wms_ecommerce_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_id UUID REFERENCES public.wms_ecommerce_platforms(id),
  external_order_id TEXT NOT NULL,
  order_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  shipping_address TEXT,
  order_date TIMESTAMP WITH TIME ZONE,
  total_amount NUMERIC(12,2),
  status TEXT DEFAULT 'pending',
  sync_status TEXT DEFAULT 'synced',
  outbound_order_id UUID REFERENCES public.wms_outbound_orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Temperature Zones Table
CREATE TABLE public.wms_temperature_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name TEXT NOT NULL,
  zone_code TEXT NOT NULL UNIQUE,
  target_temp_min NUMERIC(5,2),
  target_temp_max NUMERIC(5,2),
  current_temp NUMERIC(5,2),
  humidity_min NUMERIC(5,2),
  humidity_max NUMERIC(5,2),
  current_humidity NUMERIC(5,2),
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical')),
  last_reading_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sensor_id TEXT,
  location_id UUID REFERENCES public.wms_locations(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Temperature Readings Log
CREATE TABLE public.wms_temperature_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.wms_temperature_zones(id) ON DELETE CASCADE,
  temperature NUMERIC(5,2) NOT NULL,
  humidity NUMERIC(5,2),
  status TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- MES Work Orders Table
CREATE TABLE public.wms_mes_work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_number TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES public.wms_products(id),
  production_line TEXT,
  quantity_ordered INTEGER NOT NULL,
  quantity_completed INTEGER DEFAULT 0,
  quantity_in_progress INTEGER DEFAULT 0,
  quantity_rejected INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  priority TEXT DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- WIP (Work In Progress) Items
CREATE TABLE public.wms_wip_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.wms_mes_work_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.wms_products(id),
  location_id UUID REFERENCES public.wms_locations(id),
  quantity INTEGER NOT NULL,
  stage TEXT,
  status TEXT DEFAULT 'in_progress',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.wms_3pl_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_ecommerce_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_ecommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_temperature_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_temperature_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_mes_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_wip_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can view 3PL tenants" ON public.wms_3pl_tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage 3PL tenants" ON public.wms_3pl_tenants FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view invoices" ON public.wms_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage invoices" ON public.wms_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view invoice lines" ON public.wms_invoice_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage invoice lines" ON public.wms_invoice_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view ecommerce platforms" ON public.wms_ecommerce_platforms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage ecommerce platforms" ON public.wms_ecommerce_platforms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view ecommerce orders" ON public.wms_ecommerce_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage ecommerce orders" ON public.wms_ecommerce_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view temperature zones" ON public.wms_temperature_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage temperature zones" ON public.wms_temperature_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view temperature logs" ON public.wms_temperature_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage temperature logs" ON public.wms_temperature_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view MES work orders" ON public.wms_mes_work_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage MES work orders" ON public.wms_mes_work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view WIP items" ON public.wms_wip_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage WIP items" ON public.wms_wip_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  current_date_str TEXT;
  seq_number INT;
BEGIN
  current_date_str := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(invoice_number FROM 10)
      AS INTEGER
    )
  ), 0) + 1
  INTO seq_number
  FROM wms_invoices
  WHERE invoice_number LIKE 'INV' || current_date_str || '%';
  
  new_number := 'INV' || current_date_str || LPAD(seq_number::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;

-- Function to generate work order number
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  current_date_str TEXT;
  seq_number INT;
BEGIN
  current_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(work_order_number FROM 11)
      AS INTEGER
    )
  ), 0) + 1
  INTO seq_number
  FROM wms_mes_work_orders
  WHERE work_order_number LIKE 'WO' || current_date_str || '%';
  
  new_number := 'WO' || current_date_str || LPAD(seq_number::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_wms_3pl_tenants_updated_at BEFORE UPDATE ON public.wms_3pl_tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_invoices_updated_at BEFORE UPDATE ON public.wms_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_ecommerce_platforms_updated_at BEFORE UPDATE ON public.wms_ecommerce_platforms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_ecommerce_orders_updated_at BEFORE UPDATE ON public.wms_ecommerce_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_temperature_zones_updated_at BEFORE UPDATE ON public.wms_temperature_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_mes_work_orders_updated_at BEFORE UPDATE ON public.wms_mes_work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_wip_items_updated_at BEFORE UPDATE ON public.wms_wip_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();