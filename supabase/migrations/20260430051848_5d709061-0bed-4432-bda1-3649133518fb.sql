-- 1) Add 'dispatched' status to box_receipt_status enum
ALTER TYPE box_receipt_status ADD VALUE IF NOT EXISTS 'dispatched';

-- 2) Sequence for dispatch numbers
CREATE SEQUENCE IF NOT EXISTS box_dispatches_serial_seq START 1;

-- 3) box_dispatches table
CREATE TABLE IF NOT EXISTS public.box_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no integer NOT NULL DEFAULT nextval('box_dispatches_serial_seq'),
  dispatch_no text NOT NULL UNIQUE,
  dispatch_date date NOT NULL DEFAULT CURRENT_DATE,
  department_id uuid REFERENCES public.departments(id) ON DELETE RESTRICT,
  department_name text NOT NULL,
  signer_name text NOT NULL,
  signer_title text,
  shipping_company text,
  destination box_destination NOT NULL DEFAULT 'unspecified',
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','cancelled')),
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

CREATE INDEX IF NOT EXISTS idx_box_dispatches_date ON public.box_dispatches(dispatch_date DESC);
CREATE INDEX IF NOT EXISTS idx_box_dispatches_dept ON public.box_dispatches(department_id);
CREATE INDEX IF NOT EXISTS idx_box_dispatches_status ON public.box_dispatches(status);

-- 4) box_dispatch_items table (lines)
CREATE TABLE IF NOT EXISTS public.box_dispatch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES public.box_dispatches(id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES public.box_receipts(id) ON DELETE RESTRICT,
  qty_dispatched integer NOT NULL CHECK (qty_dispatched > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_box_dispatch_items_dispatch ON public.box_dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_box_dispatch_items_receipt ON public.box_dispatch_items(receipt_id);

-- 5) Enable RLS
ALTER TABLE public.box_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_dispatch_items ENABLE ROW LEVEL SECURITY;

-- 6) Policies for box_dispatches
CREATE POLICY "Block anonymous access to box_dispatches"
  ON public.box_dispatches FOR SELECT TO anon USING (false);

CREATE POLICY "Authenticated can view dispatches"
  ON public.box_dispatches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/manager can insert dispatches"
  ON public.box_dispatches FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND auth.uid() = created_by
  );

CREATE POLICY "Admin/manager can update dispatches"
  ON public.box_dispatches FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Only admins can delete dispatches"
  ON public.box_dispatches FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7) Policies for box_dispatch_items
CREATE POLICY "Block anonymous access to box_dispatch_items"
  ON public.box_dispatch_items FOR SELECT TO anon USING (false);

CREATE POLICY "Authenticated can view dispatch items"
  ON public.box_dispatch_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/manager can manage dispatch items"
  ON public.box_dispatch_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 8) updated_at trigger
CREATE TRIGGER trg_box_dispatches_updated_at
  BEFORE UPDATE ON public.box_dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9) Auto-generate dispatch_no like DSP-YYYY-0001
CREATE OR REPLACE FUNCTION public.set_dispatch_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.dispatch_no IS NULL OR NEW.dispatch_no = '' THEN
    NEW.dispatch_no := 'DSP-' || EXTRACT(YEAR FROM NEW.dispatch_date)::text
                     || '-' || LPAD(NEW.serial_no::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_dispatch_no
  BEFORE INSERT ON public.box_dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_dispatch_no();

-- 10) Function to apply dispatch on approval: subtract qty from receipts.
--     If receipt qty becomes 0 → status='dispatched'. If partial → keep 'received', subtract.
CREATE OR REPLACE FUNCTION public.apply_dispatch_quantities(p_dispatch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  current_qty integer;
  new_qty integer;
BEGIN
  FOR rec IN
    SELECT receipt_id, qty_dispatched
    FROM public.box_dispatch_items
    WHERE dispatch_id = p_dispatch_id
  LOOP
    SELECT qty INTO current_qty FROM public.box_receipts WHERE id = rec.receipt_id FOR UPDATE;
    IF current_qty IS NULL THEN
      RAISE EXCEPTION 'Receipt % not found', rec.receipt_id;
    END IF;
    IF rec.qty_dispatched > current_qty THEN
      RAISE EXCEPTION 'Dispatch qty (%) exceeds receipt qty (%) for receipt %',
        rec.qty_dispatched, current_qty, rec.receipt_id;
    END IF;
    new_qty := current_qty - rec.qty_dispatched;
    IF new_qty = 0 THEN
      UPDATE public.box_receipts
        SET qty = 0, status = 'dispatched', updated_at = now()
        WHERE id = rec.receipt_id;
    ELSE
      UPDATE public.box_receipts
        SET qty = new_qty, updated_at = now()
        WHERE id = rec.receipt_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_dispatch_quantities(uuid) TO authenticated;