-- 1) Add new app roles for WMS
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'storekeeper';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2) Prevent negative stock at DB level (replace warning with hard block)
CREATE OR REPLACE FUNCTION public.enforce_inv_stock_non_negative()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.qty < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: cannot result in negative quantity (% in warehouse %)', NEW.item_id, NEW.warehouse_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_inv_stock_non_negative ON public.inv_stock;
CREATE TRIGGER trg_enforce_inv_stock_non_negative
BEFORE INSERT OR UPDATE OF qty ON public.inv_stock
FOR EACH ROW EXECUTE FUNCTION public.enforce_inv_stock_non_negative();

-- 3) Same for custody (cannot return more than held)
CREATE OR REPLACE FUNCTION public.enforce_inv_custody_non_negative()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.qty < 0 THEN
    RAISE EXCEPTION 'Insufficient custody: cannot return more than held for item %', NEW.item_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_inv_custody_non_negative ON public.inv_custody;
CREATE TRIGGER trg_enforce_inv_custody_non_negative
BEFORE INSERT OR UPDATE OF qty ON public.inv_custody
FOR EACH ROW EXECUTE FUNCTION public.enforce_inv_custody_non_negative();

-- 4) View for low-stock alerts (aggregates across warehouses per item)
CREATE OR REPLACE VIEW public.inv_low_stock AS
SELECT
  i.id AS item_id,
  i.part_no,
  i.description,
  i.min_qty,
  COALESCE(SUM(s.qty), 0) AS total_qty
FROM public.items_master i
LEFT JOIN public.inv_stock s ON s.item_id = i.id
WHERE i.is_active = true
  AND COALESCE(i.min_qty, 0) > 0
GROUP BY i.id, i.part_no, i.description, i.min_qty
HAVING COALESCE(SUM(s.qty), 0) < COALESCE(i.min_qty, 0);

-- 5) Helper: stock pivot (item × warehouse) for reports
CREATE OR REPLACE VIEW public.inv_stock_summary AS
SELECT
  i.id AS item_id,
  i.part_no,
  i.description,
  i.default_unit AS unit,
  i.min_qty,
  s.warehouse_id,
  w.code AS warehouse_code,
  w.name_ar AS warehouse_name_ar,
  w.name_en AS warehouse_name_en,
  s.location_id,
  l.code AS location_code,
  s.qty,
  s.last_movement_at
FROM public.inv_stock s
JOIN public.items_master i ON i.id = s.item_id
JOIN public.warehouses w ON w.id = s.warehouse_id
LEFT JOIN public.inv_locations l ON l.id = s.location_id
WHERE i.is_active = true;