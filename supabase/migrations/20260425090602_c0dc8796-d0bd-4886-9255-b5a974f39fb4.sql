-- 1) Add invoice_number column
ALTER TABLE public.box_receipts
  ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE INDEX IF NOT EXISTS idx_box_receipts_invoice_number
  ON public.box_receipts(invoice_number)
  WHERE deleted_at IS NULL AND invoice_number IS NOT NULL;

-- 2) Backfill invoice_number from notes prefix [Invoice Number: XXX] / [رقم الفاتورة: XXX]
-- Uses a case-insensitive match. Strips the prefix from notes after extracting.
DO $$
DECLARE
  rx text := '^\s*\[(?:Invoice Number|رقم الفاتورة)\s*:\s*([^\]]+)\]\s*';
BEGIN
  UPDATE public.box_receipts
  SET
    invoice_number = TRIM((regexp_match(notes, rx, 'i'))[1]),
    notes          = NULLIF(TRIM(regexp_replace(notes, rx, '', 'i')), '')
  WHERE notes IS NOT NULL
    AND notes ~* rx
    AND invoice_number IS NULL;
END $$;

-- 3) Trigger to auto-link item_id when part_no is set/changed (on INSERT and UPDATE)
CREATE OR REPLACE FUNCTION public.sync_item_master_for_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
BEGIN
  IF NEW.part_no IS NULL OR TRIM(NEW.part_no) = '' THEN
    RETURN NEW;
  END IF;

  -- Find existing item by normalized part_no
  SELECT id INTO v_item_id
  FROM public.items_master
  WHERE LOWER(TRIM(part_no)) = LOWER(TRIM(NEW.part_no))
  LIMIT 1;

  -- Create item if missing
  IF v_item_id IS NULL THEN
    INSERT INTO public.items_master (part_no, description, default_supplier, default_unit, image_path, created_by)
    VALUES (TRIM(NEW.part_no), COALESCE(NEW.description, ''), NEW.supplier, NEW.unit, NEW.image_path, NEW.created_by)
    RETURNING id INTO v_item_id;
  END IF;

  NEW.item_id := v_item_id;
  RETURN NEW;
END;
$$;

-- Drop the older insert-only trigger (replaced by the new one that handles both INSERT and UPDATE)
DROP TRIGGER IF EXISTS trg_ensure_item_master_for_receipt ON public.box_receipts;

-- INSERT: always link/create
DROP TRIGGER IF EXISTS trg_sync_item_master_insert ON public.box_receipts;
CREATE TRIGGER trg_sync_item_master_insert
BEFORE INSERT ON public.box_receipts
FOR EACH ROW
EXECUTE FUNCTION public.sync_item_master_for_receipt();

-- UPDATE: re-link only when part_no changes
DROP TRIGGER IF EXISTS trg_sync_item_master_update ON public.box_receipts;
CREATE TRIGGER trg_sync_item_master_update
BEFORE UPDATE OF part_no ON public.box_receipts
FOR EACH ROW
WHEN (NEW.part_no IS DISTINCT FROM OLD.part_no)
EXECUTE FUNCTION public.sync_item_master_for_receipt();