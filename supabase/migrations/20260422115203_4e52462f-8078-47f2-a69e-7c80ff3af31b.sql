-- 1) Create items_master table (the unique parts dictionary)
CREATE TABLE public.items_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no text NOT NULL,
  description text NOT NULL DEFAULT '',
  default_supplier text,
  default_unit public.box_unit NOT NULL DEFAULT 'PCS',
  image_path text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX items_master_part_no_unique
  ON public.items_master (LOWER(TRIM(part_no)));

CREATE INDEX items_master_active_idx ON public.items_master (is_active);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_items_master_updated_at
BEFORE UPDATE ON public.items_master
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.items_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view items master"
ON public.items_master FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert items"
ON public.items_master FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update items"
ON public.items_master FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Only admins can delete items"
ON public.items_master FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.box_receipts
  ADD COLUMN item_id uuid REFERENCES public.items_master(id) ON DELETE RESTRICT;

CREATE INDEX box_receipts_item_id_idx ON public.box_receipts (item_id);

-- Backfill items_master from existing receipts
INSERT INTO public.items_master (part_no, description, default_supplier, default_unit, image_path, created_by)
SELECT DISTINCT ON (LOWER(TRIM(br.part_no)))
  TRIM(br.part_no),
  COALESCE(br.description, ''),
  br.supplier,
  br.unit,
  br.image_path,
  br.created_by
FROM public.box_receipts br
WHERE br.part_no IS NOT NULL AND TRIM(br.part_no) <> ''
ORDER BY LOWER(TRIM(br.part_no)), br.created_at DESC;

-- Temporarily disable audit trigger during the one-time backfill update
ALTER TABLE public.box_receipts DISABLE TRIGGER USER;

UPDATE public.box_receipts br
SET item_id = im.id
FROM public.items_master im
WHERE LOWER(TRIM(br.part_no)) = LOWER(TRIM(im.part_no))
  AND br.item_id IS NULL;

ALTER TABLE public.box_receipts ENABLE TRIGGER USER;

-- Trigger to auto-link/create items_master on receipt insert
CREATE OR REPLACE FUNCTION public.ensure_item_master_for_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.part_no IS NULL OR TRIM(NEW.part_no) = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_item_id
  FROM public.items_master
  WHERE LOWER(TRIM(part_no)) = LOWER(TRIM(NEW.part_no))
  LIMIT 1;

  IF v_item_id IS NULL THEN
    INSERT INTO public.items_master (part_no, description, default_supplier, default_unit, image_path, created_by)
    VALUES (TRIM(NEW.part_no), COALESCE(NEW.description, ''), NEW.supplier, NEW.unit, NEW.image_path, NEW.created_by)
    RETURNING id INTO v_item_id;
  END IF;

  NEW.item_id := v_item_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ensure_item_master_for_receipt
BEFORE INSERT ON public.box_receipts
FOR EACH ROW EXECUTE FUNCTION public.ensure_item_master_for_receipt();

-- Prevent deleting an item that still has active receipts
CREATE OR REPLACE FUNCTION public.prevent_item_delete_when_in_use()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.box_receipts
    WHERE item_id = OLD.id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot delete item with active receipts. Deactivate it instead.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_item_delete_when_in_use
BEFORE DELETE ON public.items_master
FOR EACH ROW EXECUTE FUNCTION public.prevent_item_delete_when_in_use();