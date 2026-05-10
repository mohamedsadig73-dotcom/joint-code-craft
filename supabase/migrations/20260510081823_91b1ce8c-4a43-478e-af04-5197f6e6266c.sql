
-- Backfill: copy first available receipt image to items_master where empty
UPDATE public.items_master im
SET image_path = sub.image_path,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (item_id) item_id, image_path
  FROM public.box_receipts
  WHERE item_id IS NOT NULL
    AND image_path IS NOT NULL
    AND image_path <> ''
    AND deleted_at IS NULL
  ORDER BY item_id, created_at ASC
) sub
WHERE im.id = sub.item_id
  AND (im.image_path IS NULL OR im.image_path = '');

-- Trigger: auto-promote receipt image to items_master when missing
CREATE OR REPLACE FUNCTION public.promote_receipt_image_to_master()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.item_id IS NOT NULL
     AND NEW.image_path IS NOT NULL
     AND NEW.image_path <> '' THEN
    UPDATE public.items_master
    SET image_path = NEW.image_path,
        updated_at = now()
    WHERE id = NEW.item_id
      AND (image_path IS NULL OR image_path = '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_receipt_image_to_master ON public.box_receipts;
CREATE TRIGGER trg_promote_receipt_image_to_master
AFTER INSERT OR UPDATE OF image_path ON public.box_receipts
FOR EACH ROW
EXECUTE FUNCTION public.promote_receipt_image_to_master();
