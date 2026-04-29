-- Recreate views with security_invoker (PostgreSQL 15+) — runs with caller's perms
DROP VIEW IF EXISTS public.inv_low_stock;
CREATE VIEW public.inv_low_stock
WITH (security_invoker = on) AS
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

DROP VIEW IF EXISTS public.inv_stock_summary;
CREATE VIEW public.inv_stock_summary
WITH (security_invoker = on) AS
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