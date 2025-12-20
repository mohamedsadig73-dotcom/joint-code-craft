-- =============================================
-- WMS (Warehouse Management System) Database Schema
-- =============================================

-- 1. Warehouse Locations Table (المواقع داخل المخزن)
CREATE TABLE public.wms_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  zone TEXT NOT NULL,
  aisle TEXT,
  rack TEXT,
  shelf TEXT,
  bin TEXT,
  location_type TEXT NOT NULL DEFAULT 'storage', -- storage, receiving, shipping, staging, quarantine
  is_active BOOLEAN DEFAULT true,
  max_weight NUMERIC,
  max_volume NUMERIC,
  temperature_zone TEXT, -- ambient, cold, frozen
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Products/Items Master Table (المنتجات)
CREATE TABLE public.wms_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  category TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'piece', -- piece, kg, box, pallet
  weight NUMERIC,
  volume NUMERIC,
  min_stock_level NUMERIC DEFAULT 0,
  max_stock_level NUMERIC,
  reorder_point NUMERIC,
  shelf_life_days INTEGER,
  requires_lot_tracking BOOLEAN DEFAULT false,
  requires_serial_tracking BOOLEAN DEFAULT false,
  requires_expiry_tracking BOOLEAN DEFAULT false,
  storage_conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Inventory Table (المخزون الفعلي)
CREATE TABLE public.wms_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.wms_products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.wms_locations(id) ON DELETE CASCADE,
  lot_number TEXT,
  serial_number TEXT,
  expiry_date DATE,
  manufacturing_date DATE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC DEFAULT 0,
  available_quantity NUMERIC GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  status TEXT NOT NULL DEFAULT 'available', -- available, reserved, on_hold, damaged, expired
  cost_per_unit NUMERIC,
  received_date DATE,
  last_counted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_inventory_location UNIQUE (product_id, location_id, lot_number, serial_number)
);

-- 4. Suppliers/Vendors Table (الموردين)
CREATE TABLE public.wms_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Inbound Orders (أوامر الاستلام)
CREATE TYPE public.wms_order_status AS ENUM ('draft', 'pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.wms_inbound_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.wms_suppliers(id),
  status wms_order_status NOT NULL DEFAULT 'draft',
  expected_date DATE,
  received_date TIMESTAMP WITH TIME ZONE,
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  received_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Inbound Order Lines (تفاصيل أوامر الاستلام)
CREATE TABLE public.wms_inbound_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inbound_order_id UUID NOT NULL REFERENCES public.wms_inbound_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.wms_products(id),
  expected_quantity NUMERIC NOT NULL,
  received_quantity NUMERIC DEFAULT 0,
  lot_number TEXT,
  expiry_date DATE,
  location_id UUID REFERENCES public.wms_locations(id),
  status TEXT DEFAULT 'pending', -- pending, partial, completed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Outbound Orders (أوامر الصرف/الشحن)
CREATE TABLE public.wms_outbound_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_reference TEXT,
  status wms_order_status NOT NULL DEFAULT 'draft',
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  expected_ship_date DATE,
  shipped_date TIMESTAMP WITH TIME ZONE,
  shipping_address TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  picked_by UUID REFERENCES public.profiles(id),
  packed_by UUID REFERENCES public.profiles(id),
  shipped_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Outbound Order Lines (تفاصيل أوامر الصرف)
CREATE TABLE public.wms_outbound_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outbound_order_id UUID NOT NULL REFERENCES public.wms_outbound_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.wms_products(id),
  requested_quantity NUMERIC NOT NULL,
  picked_quantity NUMERIC DEFAULT 0,
  packed_quantity NUMERIC DEFAULT 0,
  shipped_quantity NUMERIC DEFAULT 0,
  lot_number TEXT,
  serial_number TEXT,
  location_id UUID REFERENCES public.wms_locations(id),
  status TEXT DEFAULT 'pending', -- pending, picking, picked, packing, packed, shipped
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Inventory Transactions (حركات المخزون)
CREATE TYPE public.wms_transaction_type AS ENUM ('receive', 'putaway', 'pick', 'pack', 'ship', 'transfer', 'adjustment', 'cycle_count', 'return');

CREATE TABLE public.wms_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_type wms_transaction_type NOT NULL,
  product_id UUID NOT NULL REFERENCES public.wms_products(id),
  from_location_id UUID REFERENCES public.wms_locations(id),
  to_location_id UUID REFERENCES public.wms_locations(id),
  quantity NUMERIC NOT NULL,
  lot_number TEXT,
  serial_number TEXT,
  reference_type TEXT, -- inbound_order, outbound_order, adjustment
  reference_id UUID,
  reason TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Cycle Count (الجرد الدوري)
CREATE TABLE public.wms_cycle_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  count_number TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  location_id UUID REFERENCES public.wms_locations(id),
  product_id UUID REFERENCES public.wms_products(id),
  system_quantity NUMERIC,
  counted_quantity NUMERIC,
  variance NUMERIC GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  counted_by UUID REFERENCES public.profiles(id),
  counted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- Enable RLS on all WMS tables
-- =============================================

ALTER TABLE public.wms_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_inbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_inbound_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_outbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_outbound_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_cycle_counts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies - Admins and Managers have full access
-- =============================================

-- Locations
CREATE POLICY "Admins and managers can manage locations" ON public.wms_locations FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view locations" ON public.wms_locations FOR SELECT USING (auth.uid() IS NOT NULL);

-- Products
CREATE POLICY "Admins and managers can manage products" ON public.wms_products FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view products" ON public.wms_products FOR SELECT USING (auth.uid() IS NOT NULL);

-- Inventory
CREATE POLICY "Admins and managers can manage inventory" ON public.wms_inventory FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view inventory" ON public.wms_inventory FOR SELECT USING (auth.uid() IS NOT NULL);

-- Suppliers
CREATE POLICY "Admins and managers can manage suppliers" ON public.wms_suppliers FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view suppliers" ON public.wms_suppliers FOR SELECT USING (auth.uid() IS NOT NULL);

-- Inbound Orders
CREATE POLICY "Admins and managers can manage inbound orders" ON public.wms_inbound_orders FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view inbound orders" ON public.wms_inbound_orders FOR SELECT USING (auth.uid() IS NOT NULL);

-- Inbound Lines
CREATE POLICY "Admins and managers can manage inbound lines" ON public.wms_inbound_lines FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view inbound lines" ON public.wms_inbound_lines FOR SELECT USING (auth.uid() IS NOT NULL);

-- Outbound Orders
CREATE POLICY "Admins and managers can manage outbound orders" ON public.wms_outbound_orders FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view outbound orders" ON public.wms_outbound_orders FOR SELECT USING (auth.uid() IS NOT NULL);

-- Outbound Lines
CREATE POLICY "Admins and managers can manage outbound lines" ON public.wms_outbound_lines FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view outbound lines" ON public.wms_outbound_lines FOR SELECT USING (auth.uid() IS NOT NULL);

-- Transactions
CREATE POLICY "Admins and managers can manage transactions" ON public.wms_transactions FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view transactions" ON public.wms_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create transactions" ON public.wms_transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Cycle Counts
CREATE POLICY "Admins and managers can manage cycle counts" ON public.wms_cycle_counts FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can view cycle counts" ON public.wms_cycle_counts FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE TRIGGER update_wms_locations_updated_at BEFORE UPDATE ON public.wms_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_products_updated_at BEFORE UPDATE ON public.wms_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_inventory_updated_at BEFORE UPDATE ON public.wms_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_suppliers_updated_at BEFORE UPDATE ON public.wms_suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_inbound_orders_updated_at BEFORE UPDATE ON public.wms_inbound_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_inbound_lines_updated_at BEFORE UPDATE ON public.wms_inbound_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_outbound_orders_updated_at BEFORE UPDATE ON public.wms_outbound_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_outbound_lines_updated_at BEFORE UPDATE ON public.wms_outbound_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wms_cycle_counts_updated_at BEFORE UPDATE ON public.wms_cycle_counts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Indexes for better performance
-- =============================================

CREATE INDEX idx_wms_inventory_product ON public.wms_inventory(product_id);
CREATE INDEX idx_wms_inventory_location ON public.wms_inventory(location_id);
CREATE INDEX idx_wms_inventory_lot ON public.wms_inventory(lot_number);
CREATE INDEX idx_wms_inventory_expiry ON public.wms_inventory(expiry_date);
CREATE INDEX idx_wms_products_sku ON public.wms_products(sku);
CREATE INDEX idx_wms_products_barcode ON public.wms_products(barcode);
CREATE INDEX idx_wms_transactions_product ON public.wms_transactions(product_id);
CREATE INDEX idx_wms_transactions_type ON public.wms_transactions(transaction_type);
CREATE INDEX idx_wms_transactions_date ON public.wms_transactions(performed_at);
CREATE INDEX idx_wms_inbound_orders_status ON public.wms_inbound_orders(status);
CREATE INDEX idx_wms_outbound_orders_status ON public.wms_outbound_orders(status);

-- =============================================
-- Function to generate order numbers
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_wms_order_number(prefix TEXT)
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
  
  -- Get the next sequence number for today
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(order_number FROM LENGTH(prefix) + 9)
      AS INTEGER
    )
  ), 0) + 1
  INTO seq_number
  FROM (
    SELECT order_number FROM wms_inbound_orders WHERE order_number LIKE prefix || current_date_str || '%'
    UNION ALL
    SELECT order_number FROM wms_outbound_orders WHERE order_number LIKE prefix || current_date_str || '%'
  ) combined;
  
  new_number := prefix || current_date_str || LPAD(seq_number::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;

-- Function to generate cycle count number
CREATE OR REPLACE FUNCTION public.generate_cycle_count_number()
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
      SUBSTRING(count_number FROM 11)
      AS INTEGER
    )
  ), 0) + 1
  INTO seq_number
  FROM wms_cycle_counts
  WHERE count_number LIKE 'CC' || current_date_str || '%';
  
  new_number := 'CC' || current_date_str || LPAD(seq_number::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;