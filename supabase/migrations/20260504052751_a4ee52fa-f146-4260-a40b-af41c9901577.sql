-- Stock counts (mobile stocktake) in public schema
CREATE TABLE IF NOT EXISTS public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_no text UNIQUE,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  status public.stock_count_status NOT NULL DEFAULT 'draft',
  notes text,
  total_variance_qty numeric DEFAULT 0,
  total_variance_value numeric DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  posted_by uuid REFERENCES public.profiles(id),
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  line_no int NOT NULL DEFAULT 1,
  item_id uuid NOT NULL REFERENCES public.items_master(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.inv_locations(id) ON DELETE SET NULL,
  expected_qty numeric NOT NULL DEFAULT 0,
  counted_qty numeric NOT NULL DEFAULT 0,
  variance_qty numeric GENERATED ALWAYS AS (counted_qty - expected_qty) STORED,
  unit_cost numeric NOT NULL DEFAULT 0,
  remarks text,
  counted_by uuid REFERENCES public.profiles(id),
  counted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_count_lines_count ON public.stock_count_lines(count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_lines_item ON public.stock_count_lines(item_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_count_lines_item ON public.stock_count_lines(count_id, item_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_lines ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_stock_count_no_pub()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year text; v_seq int;
BEGIN
  IF NEW.count_no IS NULL OR NEW.count_no = '' THEN
    v_year := TO_CHAR(COALESCE(NEW.count_date, CURRENT_DATE), 'YYYY');
    SELECT COALESCE(MAX(CAST(SPLIT_PART(count_no,'-',3) AS INT)),0)+1
      INTO v_seq FROM public.stock_counts WHERE count_no LIKE 'CNT-'||v_year||'-%';
    NEW.count_no := 'CNT-'||v_year||'-'||LPAD(v_seq::text,4,'0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_stock_count_no ON public.stock_counts;
CREATE TRIGGER trg_set_stock_count_no BEFORE INSERT ON public.stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.set_stock_count_no_pub();

DROP TRIGGER IF EXISTS trg_stock_counts_updated ON public.stock_counts;
CREATE TRIGGER trg_stock_counts_updated BEFORE UPDATE ON public.stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "sc_select" ON public.stock_counts FOR SELECT TO authenticated USING (true);
CREATE POLICY "sc_insert" ON public.stock_counts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sc_update" ON public.stock_counts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "sc_delete" ON public.stock_counts FOR DELETE TO authenticated USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role)
);

CREATE POLICY "scl_select" ON public.stock_count_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "scl_insert" ON public.stock_count_lines FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "scl_update" ON public.stock_count_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "scl_delete" ON public.stock_count_lines FOR DELETE TO authenticated USING (true);