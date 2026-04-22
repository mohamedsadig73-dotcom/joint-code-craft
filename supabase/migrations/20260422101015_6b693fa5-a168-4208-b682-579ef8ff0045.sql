-- Recreate view with security_invoker to enforce RLS of querying user
DROP VIEW IF EXISTS public.box_summary;

CREATE VIEW public.box_summary
WITH (security_invoker = true)
AS
SELECT
  box_no,
  string_agg(DISTINCT supplier, ' / ' ORDER BY supplier) AS suppliers,
  destination,
  COUNT(*)::INTEGER AS items_count,
  SUM(qty)::INTEGER AS total_qty,
  MIN(receipt_date) AS first_date,
  MAX(receipt_date) AS last_date,
  MAX(updated_at) AS last_updated
FROM public.box_receipts
WHERE deleted_at IS NULL
GROUP BY box_no, destination;