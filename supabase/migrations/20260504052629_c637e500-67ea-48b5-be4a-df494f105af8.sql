ALTER TYPE public.stock_count_status ADD VALUE IF NOT EXISTS 'submitted' BEFORE 'posted';

DO $$ BEGIN
  CREATE TYPE public.item_approval_status AS ENUM ('draft','pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.items_master
  ADD COLUMN IF NOT EXISTS approval_status public.item_approval_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_items_master_approval ON public.items_master(approval_status);

CREATE OR REPLACE VIEW public.v_low_stock_alerts AS
SELECT
  im.id AS item_id, im.part_no, im.description, im.name_ar,
  im.min_qty, im.max_qty, im.reorder_qty,
  s.warehouse_id,
  w.name_ar AS warehouse_name,
  COALESCE(SUM(s.qty),0) AS qty_on_hand,
  CASE
    WHEN COALESCE(SUM(s.qty),0) <= 0 THEN 'out_of_stock'
    WHEN im.min_qty IS NOT NULL AND COALESCE(SUM(s.qty),0) < im.min_qty THEN 'below_min'
    WHEN im.reorder_qty IS NOT NULL AND COALESCE(SUM(s.qty),0) <= im.reorder_qty THEN 'reorder'
    WHEN im.max_qty IS NOT NULL AND COALESCE(SUM(s.qty),0) > im.max_qty THEN 'above_max'
    ELSE 'ok'
  END AS alert_level
FROM public.items_master im
LEFT JOIN public.inv_stock s ON s.item_id = im.id
LEFT JOIN public.warehouses w ON w.id = s.warehouse_id
WHERE im.is_active = true
GROUP BY im.id, im.part_no, im.description, im.name_ar, im.min_qty, im.max_qty, im.reorder_qty, s.warehouse_id, w.name_ar;

GRANT SELECT ON public.v_low_stock_alerts TO authenticated;