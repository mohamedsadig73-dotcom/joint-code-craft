-- Auto-populate qr_payload when item is approved or internal_ref set
CREATE OR REPLACE FUNCTION public.fn_items_master_auto_qr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_payload IS NULL OR NEW.qr_payload = '' THEN
    IF NEW.internal_ref IS NOT NULL THEN
      NEW.qr_payload := 'ITEM:' || NEW.internal_ref || '|PN:' || COALESCE(NEW.part_no,'') || '|ID:' || NEW.id::text;
    END IF;
  END IF;
  -- Recalculate naming quality score
  NEW.naming_quality_score := public.calculate_item_quality_score(
    NEW.name_ar, NEW.name_en, NEW.category_id, NEW.sub_category_id,
    NEW.uom_dict_id, NEW.brand, NEW.spec, NEW.part_no, NEW.description
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_items_master_auto_qr ON public.items_master;
CREATE TRIGGER trg_items_master_auto_qr
BEFORE INSERT OR UPDATE OF internal_ref, part_no, approval_status, name_ar, name_en, category_id, sub_category_id, uom_dict_id, brand, spec, description
ON public.items_master
FOR EACH ROW
EXECUTE FUNCTION public.fn_items_master_auto_qr();

-- Backfill existing rows
UPDATE public.items_master
SET qr_payload = 'ITEM:' || COALESCE(internal_ref, part_no) || '|PN:' || COALESCE(part_no,'') || '|ID:' || id::text
WHERE qr_payload IS NULL AND (internal_ref IS NOT NULL OR part_no IS NOT NULL);