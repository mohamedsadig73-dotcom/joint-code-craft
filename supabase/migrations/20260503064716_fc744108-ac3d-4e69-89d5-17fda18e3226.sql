
-- ITEM <-> SUPPLIERS
CREATE TABLE IF NOT EXISTS public.item_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items_master(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_item_code text,
  purchase_price numeric NOT NULL DEFAULT 0,
  is_preferred boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, supplier_id)
);
CREATE INDEX IF NOT EXISTS idx_item_suppliers_item ON public.item_suppliers(item_id);
ALTER TABLE public.item_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read item_suppliers" ON public.item_suppliers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin/manager write item_suppliers" ON public.item_suppliers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_item_suppliers_updated BEFORE UPDATE ON public.item_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ITEM <-> WAREHOUSES
CREATE TABLE IF NOT EXISTS public.item_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items_master(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  min_qty numeric DEFAULT 0,
  max_qty numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_item_warehouses_item ON public.item_warehouses(item_id);
ALTER TABLE public.item_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read item_warehouses" ON public.item_warehouses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin/manager write item_warehouses" ON public.item_warehouses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

-- RECEIVING STAFF
CREATE TABLE IF NOT EXISTS public.receiving_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial int GENERATED ALWAYS AS IDENTITY,
  personal_id text,
  employee_no text,
  full_name text NOT NULL,
  job_title text,
  phone text,
  authorized_by text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.receiving_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read receiving_staff" ON public.receiving_staff
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "admin/manager write receiving_staff" ON public.receiving_staff
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_receiving_staff_updated BEFORE UPDATE ON public.receiving_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- EXTEND items_master
ALTER TABLE public.items_master
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS plate_no text,
  ADD COLUMN IF NOT EXISTS has_expiry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'item';

CREATE UNIQUE INDEX IF NOT EXISTS uq_items_master_barcode ON public.items_master(barcode) WHERE barcode IS NOT NULL;
