
-- Movement type enum
CREATE TYPE public.stock_movement_type AS ENUM ('receipt', 'issue', 'transfer');
CREATE TYPE public.stock_movement_status AS ENUM ('draft', 'posted', 'cancelled');

-- Stock movements header
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_no TEXT NOT NULL UNIQUE,
  movement_type public.stock_movement_type NOT NULL,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.stock_movement_status NOT NULL DEFAULT 'draft',
  -- Source warehouse (for issue/transfer)
  from_warehouse_id UUID REFERENCES public.warehouses(id),
  -- Destination warehouse (for receipt/transfer)
  to_warehouse_id UUID REFERENCES public.warehouses(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  department_id UUID REFERENCES public.departments(id),
  project_id UUID REFERENCES public.projects(id),
  reference_no TEXT,
  notes TEXT,
  total_qty NUMERIC(18,3) NOT NULL DEFAULT 0,
  total_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_type_date ON public.stock_movements(movement_type, movement_date DESC);
CREATE INDEX idx_stock_movements_status ON public.stock_movements(status);

-- Stock movement lines
CREATE TABLE public.stock_movement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES public.stock_movements(id) ON DELETE CASCADE,
  line_no INT NOT NULL,
  item_id UUID NOT NULL REFERENCES public.items_master(id),
  qty NUMERIC(18,3) NOT NULL CHECK (qty > 0),
  unit_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) GENERATED ALWAYS AS (qty * unit_cost) STORED,
  uom_id UUID REFERENCES public.units_of_measure(id),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movement_lines_movement ON public.stock_movement_lines(movement_id);
CREATE INDEX idx_stock_movement_lines_item ON public.stock_movement_lines(item_id);

-- Stock balances (warehouse x item)
CREATE TABLE public.stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  item_id UUID NOT NULL REFERENCES public.items_master(id),
  qty_on_hand NUMERIC(18,3) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  last_movement_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, item_id)
);

CREATE INDEX idx_stock_balances_item ON public.stock_balances(item_id);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies: read for authenticated, write for admin/manager
CREATE POLICY "Authenticated can view stock_movements"
  ON public.stock_movements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Manager can insert stock_movements"
  ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin/Manager can update stock_movements"
  ON public.stock_movements FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can delete stock_movements"
  ON public.stock_movements FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view stock_movement_lines"
  ON public.stock_movement_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Manager can manage stock_movement_lines"
  ON public.stock_movement_lines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated can view stock_balances"
  ON public.stock_balances FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage stock_balances"
  ON public.stock_balances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- updated_at triggers
CREATE TRIGGER trg_stock_movements_updated
  BEFORE UPDATE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_stock_balances_updated
  BEFORE UPDATE ON public.stock_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generate movement number
CREATE OR REPLACE FUNCTION public.generate_stock_movement_no(_type public.stock_movement_type)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_year TEXT;
  v_seq INT;
  v_no TEXT;
BEGIN
  v_prefix := CASE _type
    WHEN 'receipt' THEN 'RCV'
    WHEN 'issue' THEN 'ISS'
    WHEN 'transfer' THEN 'TRF'
  END;
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(movement_no FROM LENGTH(v_prefix) + 6) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM stock_movements
  WHERE movement_no LIKE v_prefix || '-' || v_year || '-%';

  v_no := v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_no;
END;
$$;

-- Auto-assign movement_no
CREATE OR REPLACE FUNCTION public.set_stock_movement_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.movement_no IS NULL OR NEW.movement_no = '' THEN
    NEW.movement_no := generate_stock_movement_no(NEW.movement_type);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_stock_movement_no
  BEFORE INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_stock_movement_no();

-- Apply movement to balances when status -> posted
CREATE OR REPLACE FUNCTION public.apply_stock_movement_to_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line RECORD;
  v_existing NUMERIC;
  v_existing_cost NUMERIC;
  v_new_qty NUMERIC;
  v_new_cost NUMERIC;
BEGIN
  -- Only when transitioning to 'posted'
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status <> 'posted') THEN

    -- Compute totals from lines
    UPDATE stock_movements sm
    SET total_qty = COALESCE((SELECT SUM(qty) FROM stock_movement_lines WHERE movement_id = sm.id), 0),
        total_value = COALESCE((SELECT SUM(line_total) FROM stock_movement_lines WHERE movement_id = sm.id), 0),
        posted_at = NOW(),
        posted_by = auth.uid()
    WHERE sm.id = NEW.id;

    FOR v_line IN
      SELECT * FROM stock_movement_lines WHERE movement_id = NEW.id ORDER BY line_no
    LOOP
      -- RECEIPT: add to to_warehouse
      IF NEW.movement_type = 'receipt' THEN
        INSERT INTO stock_balances (warehouse_id, item_id, qty_on_hand, avg_cost, last_movement_at)
        VALUES (NEW.to_warehouse_id, v_line.item_id, v_line.qty, v_line.unit_cost, NOW())
        ON CONFLICT (warehouse_id, item_id) DO UPDATE
          SET qty_on_hand = stock_balances.qty_on_hand + v_line.qty,
              avg_cost = CASE
                WHEN (stock_balances.qty_on_hand + v_line.qty) > 0
                THEN ((stock_balances.qty_on_hand * stock_balances.avg_cost) + (v_line.qty * v_line.unit_cost))
                     / (stock_balances.qty_on_hand + v_line.qty)
                ELSE v_line.unit_cost
              END,
              last_movement_at = NOW();

      -- ISSUE: subtract from from_warehouse (warn only, do not block)
      ELSIF NEW.movement_type = 'issue' THEN
        INSERT INTO stock_balances (warehouse_id, item_id, qty_on_hand, avg_cost, last_movement_at)
        VALUES (NEW.from_warehouse_id, v_line.item_id, -v_line.qty, v_line.unit_cost, NOW())
        ON CONFLICT (warehouse_id, item_id) DO UPDATE
          SET qty_on_hand = stock_balances.qty_on_hand - v_line.qty,
              last_movement_at = NOW();

        -- Warning notice (no block)
        SELECT qty_on_hand INTO v_existing
        FROM stock_balances
        WHERE warehouse_id = NEW.from_warehouse_id AND item_id = v_line.item_id;
        IF v_existing < 0 THEN
          RAISE NOTICE 'WARN: negative balance for item % in warehouse %: %', v_line.item_id, NEW.from_warehouse_id, v_existing;
        END IF;

      -- TRANSFER: subtract from source, add to destination
      ELSIF NEW.movement_type = 'transfer' THEN
        INSERT INTO stock_balances (warehouse_id, item_id, qty_on_hand, avg_cost, last_movement_at)
        VALUES (NEW.from_warehouse_id, v_line.item_id, -v_line.qty, v_line.unit_cost, NOW())
        ON CONFLICT (warehouse_id, item_id) DO UPDATE
          SET qty_on_hand = stock_balances.qty_on_hand - v_line.qty,
              last_movement_at = NOW();

        INSERT INTO stock_balances (warehouse_id, item_id, qty_on_hand, avg_cost, last_movement_at)
        VALUES (NEW.to_warehouse_id, v_line.item_id, v_line.qty, v_line.unit_cost, NOW())
        ON CONFLICT (warehouse_id, item_id) DO UPDATE
          SET qty_on_hand = stock_balances.qty_on_hand + v_line.qty,
              last_movement_at = NOW();
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_stock_movement
  AFTER UPDATE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement_to_balances();

-- Validate movement before posting
CREATE OR REPLACE FUNCTION public.validate_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status <> 'posted') THEN
    IF NEW.movement_type = 'receipt' AND NEW.to_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Receipt requires to_warehouse_id';
    END IF;
    IF NEW.movement_type = 'issue' AND NEW.from_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Issue requires from_warehouse_id';
    END IF;
    IF NEW.movement_type = 'transfer' AND (NEW.from_warehouse_id IS NULL OR NEW.to_warehouse_id IS NULL) THEN
      RAISE EXCEPTION 'Transfer requires from_warehouse_id and to_warehouse_id';
    END IF;
    IF NEW.movement_type = 'transfer' AND NEW.from_warehouse_id = NEW.to_warehouse_id THEN
      RAISE EXCEPTION 'Transfer source and destination must be different';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM stock_movement_lines WHERE movement_id = NEW.id) THEN
      RAISE EXCEPTION 'Cannot post movement without lines';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_stock_movement
  BEFORE UPDATE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.validate_stock_movement();
