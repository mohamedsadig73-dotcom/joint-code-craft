-- 1. Add packing_type enum and column to box_receipts
CREATE TYPE public.packing_type AS ENUM ('boxed', 'loose');

ALTER TABLE public.box_receipts 
  ADD COLUMN packing_type public.packing_type NOT NULL DEFAULT 'boxed';

ALTER TABLE public.box_receipts ALTER COLUMN box_no DROP NOT NULL;

ALTER TABLE public.box_receipts 
  ADD CONSTRAINT chk_box_no_required 
  CHECK (
    packing_type = 'loose' 
    OR (packing_type = 'boxed' AND box_no IS NOT NULL AND box_no <> '')
  );

-- 2. Recreate box_summary view to exclude loose items
DROP VIEW IF EXISTS public.box_summary;

CREATE VIEW public.box_summary 
WITH (security_invoker = true) AS
SELECT 
  box_no,
  string_agg(DISTINCT supplier, ' / ') AS suppliers,
  destination,
  COUNT(*)::int AS items_count,
  SUM(qty)::int AS total_qty,
  MIN(receipt_date) AS date
FROM public.box_receipts 
WHERE deleted_at IS NULL 
  AND packing_type = 'boxed'
  AND box_no IS NOT NULL
GROUP BY box_no, destination;

-- 3. Container status enum
CREATE TYPE public.container_status AS ENUM ('preparing', 'sealed', 'shipped', 'delivered');

-- 4. shipping_containers table
CREATE TABLE public.shipping_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_no text NOT NULL UNIQUE,
  shipping_company text NOT NULL,
  destination public.box_destination NOT NULL,
  shipped_date date,
  status public.container_status NOT NULL DEFAULT 'preparing',
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.shipping_containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view containers"
  ON public.shipping_containers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can create containers"
  ON public.shipping_containers FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins and managers can update containers"
  ON public.shipping_containers FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Only admins can hard delete containers"
  ON public.shipping_containers FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_shipping_containers_destination ON public.shipping_containers(destination) WHERE deleted_at IS NULL;
CREATE INDEX idx_shipping_containers_status ON public.shipping_containers(status) WHERE deleted_at IS NULL;

-- 5. container_items table
CREATE TABLE public.container_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid NOT NULL REFERENCES public.shipping_containers(id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES public.box_receipts(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid REFERENCES public.profiles(id),
  UNIQUE(container_id, receipt_id)
);

ALTER TABLE public.container_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view container items"
  ON public.container_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can add container items"
  ON public.container_items FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins and managers can remove container items"
  ON public.container_items FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  );

CREATE INDEX idx_container_items_container ON public.container_items(container_id);
CREATE INDEX idx_container_items_receipt ON public.container_items(receipt_id);

-- 6. container_summary view
CREATE VIEW public.container_summary 
WITH (security_invoker = true) AS
SELECT 
  c.id AS container_id,
  c.container_no,
  c.shipping_company,
  c.destination,
  c.status,
  c.shipped_date,
  c.created_at,
  COALESCE(COUNT(DISTINCT br.box_no) FILTER (WHERE br.packing_type = 'boxed'), 0)::int AS boxes_count,
  COALESCE(COUNT(*) FILTER (WHERE br.packing_type = 'loose'), 0)::int AS loose_count,
  COALESCE(SUM(br.qty), 0)::int AS total_qty,
  COALESCE(string_agg(DISTINCT br.supplier, ' / '), '') AS suppliers
FROM public.shipping_containers c
LEFT JOIN public.container_items ci ON ci.container_id = c.id
LEFT JOIN public.box_receipts br ON br.id = ci.receipt_id AND br.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.container_no, c.shipping_company, c.destination, c.status, c.shipped_date, c.created_at;

-- 7. updated_at trigger for shipping_containers
CREATE TRIGGER update_shipping_containers_updated_at
  BEFORE UPDATE ON public.shipping_containers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Audit triggers (reuse existing audit function pattern)
CREATE OR REPLACE FUNCTION public.audit_containers_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_shipping_containers
  AFTER INSERT OR UPDATE OR DELETE ON public.shipping_containers
  FOR EACH ROW EXECUTE FUNCTION public.audit_containers_changes();

CREATE TRIGGER audit_container_items
  AFTER INSERT OR DELETE ON public.container_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_containers_changes();