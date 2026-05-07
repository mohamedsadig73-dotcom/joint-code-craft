CREATE OR REPLACE FUNCTION public.fn_items_master_auto_qr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_score integer := 0;
BEGIN
  IF NEW.qr_payload IS NULL OR NEW.qr_payload = '' THEN
    IF NEW.internal_ref IS NOT NULL THEN
      NEW.qr_payload := 'ITEM:' || NEW.internal_ref || '|PN:' || COALESCE(NEW.part_no,'') || '|ID:' || NEW.id::text;
    END IF;
  END IF;

  -- Inline naming quality score (previous helper signature changed)
  IF COALESCE(NEW.part_no,'') <> '' THEN v_score := v_score + 20; END IF;
  IF COALESCE(NEW.description,'') <> '' THEN v_score := v_score + 15; END IF;
  IF COALESCE(NEW.name_ar,'') <> '' THEN v_score := v_score + 15; END IF;
  IF COALESCE(NEW.name_en,'') <> '' THEN v_score := v_score + 10; END IF;
  IF NEW.category_id IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF NEW.sub_category_id IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF NEW.uom_dict_id IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF COALESCE(NEW.brand,'') <> '' THEN v_score := v_score + 8; END IF;
  IF COALESCE(NEW.spec,'') <> '' THEN v_score := v_score + 7; END IF;

  NEW.naming_quality_score := LEAST(v_score, 100);
  RETURN NEW;
END;
$function$;