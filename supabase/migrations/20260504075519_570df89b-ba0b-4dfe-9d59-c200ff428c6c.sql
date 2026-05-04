-- 1) UOM Conversions
CREATE TABLE IF NOT EXISTS public.uom_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_uom_id uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE CASCADE,
  to_uom_id uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE CASCADE,
  factor numeric NOT NULL CHECK (factor > 0),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_uom_id, to_uom_id)
);

ALTER TABLE public.uom_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read uom_conversions" ON public.uom_conversions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "block anon uom_conversions" ON public.uom_conversions
  FOR SELECT TO anon USING (false);

CREATE POLICY "admin/mgr insert uom_conversions" ON public.uom_conversions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "admin/mgr update uom_conversions" ON public.uom_conversions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "admin delete uom_conversions" ON public.uom_conversions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_uom_conversions_updated_at
  BEFORE UPDATE ON public.uom_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) Branches
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  address text,
  phone text,
  manager_name text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read branches" ON public.branches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "block anon branches" ON public.branches
  FOR SELECT TO anon USING (false);

CREATE POLICY "admin/mgr insert branches" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "admin/mgr update branches" ON public.branches
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "admin delete branches" ON public.branches
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3) items_master: is_dormant + classification_id
ALTER TABLE public.items_master
  ADD COLUMN IF NOT EXISTS is_dormant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS classification_id uuid REFERENCES public.item_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_master_is_dormant ON public.items_master(is_dormant) WHERE is_dormant = true;
CREATE INDEX IF NOT EXISTS idx_items_master_classification ON public.items_master(classification_id);


-- 4) box_dispatches: project_id + receiving_staff_id
ALTER TABLE public.box_dispatches
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receiving_staff_id uuid REFERENCES public.receiving_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_box_dispatches_project ON public.box_dispatches(project_id);
CREATE INDEX IF NOT EXISTS idx_box_dispatches_recv_staff ON public.box_dispatches(receiving_staff_id);