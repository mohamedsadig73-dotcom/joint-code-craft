CREATE SCHEMA IF NOT EXISTS archive;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'stock_movement_lines','stock_movements','stock_balances',
    'stock_count_lines','stock_counts',
    'wms_invoice_lines','wms_invoices','wms_cycle_counts',
    'wms_inbound_lines','wms_inbound_orders',
    'wms_outbound_lines','wms_outbound_orders',
    'wms_cross_dock_lines','wms_cross_dock',
    'wms_rma_lines','wms_rma',
    'wms_ecommerce_orders','wms_ecommerce_platforms',
    'wms_temperature_logs','wms_temperature_zones',
    'wms_serial_numbers','wms_inventory','wms_locations',
    'wms_products','wms_suppliers','wms_transactions',
    'wms_3pl_tenants','wms_mes_work_orders','wms_wip_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive', t);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name FROM information_schema.tables WHERE table_schema='archive' LOOP
    EXECUTE format('REVOKE ALL ON archive.%I FROM anon, authenticated', r.table_name);
  END LOOP;
END $$;