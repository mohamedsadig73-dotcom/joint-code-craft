-- Stock count status enum
CREATE TYPE public.stock_count_status AS ENUM ('draft', 'in_progress', 'posted', 'cancelled');

-- Stock counts header
CREATE TABLE public.stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_no TEXT NOT NULL UNIQUE,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  status public.stock_count_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  total_variance_qty NUMERIC(18,3) NOT NULL DEFAULT 0,
  total_variance_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  adjustment_movement_id UUID REFERENCES public.stock_movements(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_counts_date ON public.stock_counts(count_date DESC);
CREATE INDEX idx_stock_counts_warehouse ON public.stock_counts(warehouse_id);

-- Stock count lines
CREATE TABLE public.stock_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  line_no INT NOT NULL,
  item_id UUID NOT NULL REFERENCES public.items_master(id),
  book_qty NUMERIC(18,3) NOT NULL DEFAULT 0,
  counted_qty NUMERIC(18,3) NOT NULL DEFAULT 0,
  variance_qty NUMERIC(18,3) GENERATED ALWAYS AS (counted_qty - book_qty) STORED,
  unit_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_count_lines_count ON public.stock_count_lines(count_id);
CREATE INDEX idx_stock_count_lines_item ON public.stock_count_lines(item_id);

-- RLS
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon stock_counts" ON public.stock_counts FOR SELECT TO anon USING (false);
CREATE POLICY "Auth view stock_counts" ON public.stock_counts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr insert stock_counts" ON public.stock_counts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Admin/Mgr update stock_counts" ON public.stock_counts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Admin delete stock_counts" ON public.stock_counts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block anon stock_count_lines" ON public.stock_count_lines FOR SELECT TO anon USING (false);
CREATE POLICY "Auth view stock_count_lines" ON public.stock_count_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr manage stock_count_lines" ON public.stock_count_lines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- updated_at trigger
CREATE TRIGGER trg_stock_counts_updated
  BEFORE UPDATE ON public.stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-numbering trigger for stock_counts
CREATE OR REPLACE FUNCTION public.set_stock_count_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  IF NEW.count_no IS NULL OR NEW.count_no = '' THEN
    v_year := TO_CHAR(COALESCE(NEW.count_date, CURRENT_DATE), 'YYYY');
    SELECT COALESCE(MAX(CAST(SPLIT_PART(count_no, '-', 3) AS INT)), 0) + 1
    INTO v_seq
    FROM stock_counts
    WHERE count_no LIKE 'CNT-' || v_year || '-%';
    NEW.count_no := 'CNT-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_stock_count_no
  BEFORE INSERT ON public.stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.set_stock_count_no();

-- Function: post a stock count -> creates an adjustment movement
CREATE OR REPLACE FUNCTION public.post_stock_count(p_count_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count RECORD;
  v_movement_id UUID;
  v_line RECORD;
  v_line_no INT := 0;
  v_total_qty NUMERIC := 0;
  v_total_value NUMERIC := 0;
  v_has_positive BOOLEAN := false;
  v_has_negative BOOLEAN := false;
  v_receipt_id UUID;
  v_issue_id UUID;
BEGIN
  -- Check permissions
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_count FROM stock_counts WHERE id = p_count_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock count not found';
  END IF;
  IF v_count.status = 'posted' THEN
    RAISE EXCEPTION 'Stock count already posted';
  END IF;

  -- Compute totals
  SELECT
    COALESCE(SUM(ABS(variance_qty)), 0),
    COALESCE(SUM(ABS(variance_qty) * unit_cost), 0),
    BOOL_OR(variance_qty > 0),
    BOOL_OR(variance_qty < 0)
  INTO v_total_qty, v_total_value, v_has_positive, v_has_negative
  FROM stock_count_lines
  WHERE count_id = p_count_id AND variance_qty <> 0;

  -- Positive variance -> receipt movement
  IF v_has_positive THEN
    INSERT INTO stock_movements (
      movement_type, movement_date, status, to_warehouse_id,
      notes, total_qty, total_value, posted_at, posted_by, created_by
    ) VALUES (
      'receipt', v_count.count_date, 'posted', v_count.warehouse_id,
      'Stock count adjustment (gain) for ' || v_count.count_no,
      0, 0, now(), auth.uid(), auth.uid()
    ) RETURNING id INTO v_receipt_id;

    FOR v_line IN
      SELECT * FROM stock_count_lines
      WHERE count_id = p_count_id AND variance_qty > 0
      ORDER BY line_no
    LOOP
      v_line_no := v_line_no + 1;
      INSERT INTO stock_movement_lines (movement_id, line_no, item_id, qty, unit_cost, remarks)
      VALUES (v_receipt_id, v_line_no, v_line.item_id, v_line.variance_qty, v_line.unit_cost,
              'Adjustment from count ' || v_count.count_no);
    END LOOP;
  END IF;

  -- Negative variance -> issue movement
  IF v_has_negative THEN
    v_line_no := 0;
    INSERT INTO stock_movements (
      movement_type, movement_date, status, from_warehouse_id,
      notes, total_qty, total_value, posted_at, posted_by, created_by
    ) VALUES (
      'issue', v_count.count_date, 'posted', v_count.warehouse_id,
      'Stock count adjustment (loss) for ' || v_count.count_no,
      0, 0, now(), auth.uid(), auth.uid()
    ) RETURNING id INTO v_issue_id;

    FOR v_line IN
      SELECT * FROM stock_count_lines
      WHERE count_id = p_count_id AND variance_qty < 0
      ORDER BY line_no
    LOOP
      v_line_no := v_line_no + 1;
      INSERT INTO stock_movement_lines (movement_id, line_no, item_id, qty, unit_cost, remarks)
      VALUES (v_issue_id, v_line_no, v_line.item_id, ABS(v_line.variance_qty), v_line.unit_cost,
              'Adjustment from count ' || v_count.count_no);
    END LOOP;
  END IF;

  v_movement_id := COALESCE(v_receipt_id, v_issue_id);

  UPDATE stock_counts
  SET status = 'posted',
      posted_at = now(),
      posted_by = auth.uid(),
      total_variance_qty = v_total_qty,
      total_variance_value = v_total_value,
      adjustment_movement_id = v_movement_id
  WHERE id = p_count_id;

  RETURN v_movement_id;
END;
$$;
