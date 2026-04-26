-- =========================================================
-- Phase 1: Inventory Foundation
-- =========================================================

-- ============ WAREHOUSES ============
CREATE TABLE public.warehouses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  location text,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon access to warehouses" ON public.warehouses FOR SELECT TO anon USING (false);
CREATE POLICY "Authenticated can view warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/managers can insert warehouses" ON public.warehouses FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Admins/managers can update warehouses" ON public.warehouses FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Only admins delete warehouses" ON public.warehouses FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============ ITEM GROUPS (hierarchical) ============
CREATE TABLE public.item_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  parent_id uuid REFERENCES public.item_groups(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_item_groups_parent ON public.item_groups(parent_id);

ALTER TABLE public.item_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Block anon item_groups" ON public.item_groups FOR SELECT TO anon USING (false);
CREATE POLICY "Auth view item_groups" ON public.item_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/mgr insert item_groups" ON public.item_groups FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin/mgr update item_groups" ON public.item_groups FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin delete item_groups" ON public.item_groups FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_item_groups_updated_at BEFORE UPDATE ON public.item_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============ ITEM CATEGORIES (hierarchical) ============
CREATE TABLE public.item_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  parent_id uuid REFERENCES public.item_categories(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_item_categories_parent ON public.item_categories(parent_id);

ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Block anon item_categories" ON public.item_categories FOR SELECT TO anon USING (false);
CREATE POLICY "Auth view item_categories" ON public.item_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/mgr insert item_categories" ON public.item_categories FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin/mgr update item_categories" ON public.item_categories FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin delete item_categories" ON public.item_categories FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_item_categories_updated_at BEFORE UPDATE ON public.item_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============ UNITS OF MEASURE ============
CREATE TABLE public.units_of_measure (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  base_unit_id uuid REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
  conversion_factor numeric NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Block anon uom" ON public.units_of_measure FOR SELECT TO anon USING (false);
CREATE POLICY "Auth view uom" ON public.units_of_measure FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/mgr insert uom" ON public.units_of_measure FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin/mgr update uom" ON public.units_of_measure FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin delete uom" ON public.units_of_measure FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_uom_updated_at BEFORE UPDATE ON public.units_of_measure
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============ SUPPLIERS ============
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_number text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Block anon suppliers" ON public.suppliers FOR SELECT TO anon USING (false);
CREATE POLICY "Auth view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/mgr insert suppliers" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin/mgr update suppliers" ON public.suppliers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin delete suppliers" ON public.suppliers FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============ DEPARTMENTS ============
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Block anon departments" ON public.departments FOR SELECT TO anon USING (false);
CREATE POLICY "Auth view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/mgr insert departments" ON public.departments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin/mgr update departments" ON public.departments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin delete departments" ON public.departments FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  description text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Block anon projects" ON public.projects FOR SELECT TO anon USING (false);
CREATE POLICY "Auth view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/mgr insert projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin/mgr update projects" ON public.projects FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Admin delete projects" ON public.projects FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============ EXTEND items_master ============
ALTER TABLE public.items_master
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.item_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.item_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uom_id uuid REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS min_qty numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_qty numeric,
  ADD COLUMN IF NOT EXISTS reorder_qty numeric,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS model_no text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS last_cost numeric,
  ADD COLUMN IF NOT EXISTS avg_cost numeric;

CREATE INDEX IF NOT EXISTS idx_items_master_barcode ON public.items_master(barcode);
CREATE INDEX IF NOT EXISTS idx_items_master_group ON public.items_master(group_id);
CREATE INDEX IF NOT EXISTS idx_items_master_category ON public.items_master(category_id);


-- ============ Seed default warehouse ============
INSERT INTO public.warehouses (code, name_ar, name_en, location, is_active)
VALUES ('MAIN', 'المخزن الرئيسي', 'Main Warehouse', 'المقر الرئيسي', true)
ON CONFLICT (code) DO NOTHING;

-- ============ Seed default UOMs (mirror box_unit enum) ============
INSERT INTO public.units_of_measure (code, name_ar, name_en, conversion_factor, is_active) VALUES
  ('PCS','قطعة','Pieces',1,true),
  ('SET','طقم','Set',1,true),
  ('BOX','صندوق','Box',1,true),
  ('KG','كيلوجرام','Kilogram',1,true),
  ('MTR','متر','Meter',1,true),
  ('LTR','لتر','Liter',1,true),
  ('PAIR','زوج','Pair',1,true),
  ('ROLL','لفة','Roll',1,true),
  ('KIT','مجموعة','Kit',1,true),
  ('BAG','كيس','Bag',1,true),
  ('CTN','كرتون','Carton',1,true),
  ('DRUM','برميل','Drum',1,true),
  ('PACK','عبوة','Pack',1,true),
  ('BTL','زجاجة','Bottle',1,true),
  ('M2','متر مربع','Square Meter',1,true),
  ('M3','متر مكعب','Cubic Meter',1,true)
ON CONFLICT (code) DO NOTHING;