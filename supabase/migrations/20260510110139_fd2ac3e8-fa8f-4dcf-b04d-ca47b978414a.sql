
-- ============================================================
-- WMS Workflow Tables (transfer requests, alerts rules, approvals)
-- ============================================================

-- Status enums
DO $$ BEGIN
  CREATE TYPE public.wms_request_status AS ENUM ('pending','approved','rejected','executed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wms_alert_rule_kind AS ENUM ('min_stock','max_stock','expiry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wms_approval_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- 1) wms_transfer_requests
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no text NOT NULL UNIQUE,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  from_warehouse_id uuid NOT NULL,
  to_warehouse_id uuid NOT NULL,
  item_id uuid NOT NULL,
  qty numeric NOT NULL CHECK (qty > 0),
  reason text,
  status wms_request_status NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  executed_txn_id uuid,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wms_tr_status ON public.wms_transfer_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wms_tr_item ON public.wms_transfer_requests(item_id);

ALTER TABLE public.wms_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wms_tr_read" ON public.wms_transfer_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wms_tr_block_anon" ON public.wms_transfer_requests
  FOR SELECT TO anon USING (false);

CREATE POLICY "wms_tr_insert" ON public.wms_transfer_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "wms_tr_update" ON public.wms_transfer_requests
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'manager'::app_role)
    OR (requested_by = auth.uid() AND status = 'pending')
  );

CREATE POLICY "wms_tr_delete" ON public.wms_transfer_requests
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_wms_tr_updated
  BEFORE UPDATE ON public.wms_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-generate request_no
CREATE OR REPLACE FUNCTION public.set_wms_tr_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_year text; v_seq int;
BEGIN
  IF NEW.request_no IS NULL OR NEW.request_no = '' THEN
    v_year := to_char(COALESCE(NEW.request_date, CURRENT_DATE), 'YYYY');
    SELECT COALESCE(MAX(CAST(split_part(request_no,'-',3) AS int)),0)+1
      INTO v_seq FROM wms_transfer_requests
      WHERE request_no LIKE 'TR-'||v_year||'-%';
    NEW.request_no := 'TR-'||v_year||'-'||LPAD(v_seq::text,4,'0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_wms_tr_no
  BEFORE INSERT ON public.wms_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_wms_tr_no();

-- ----------------------------------------------------------------
-- 2) wms_alert_rules (admin-managed thresholds)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind wms_alert_rule_kind NOT NULL,
  scope_item_id uuid,
  scope_category_id uuid,
  scope_warehouse_id uuid,
  threshold_qty numeric,
  expiry_days_ahead integer DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wms_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wms_ar_read" ON public.wms_alert_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wms_ar_block_anon" ON public.wms_alert_rules
  FOR SELECT TO anon USING (false);

CREATE POLICY "wms_ar_write" ON public.wms_alert_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));

CREATE TRIGGER trg_wms_ar_updated
  BEFORE UPDATE ON public.wms_alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------
-- 3) wms_approvals (signature trail for inv_transactions postings)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  status wms_approval_status NOT NULL DEFAULT 'pending',
  signer_name text,
  signer_title text,
  signer_employee_no text,
  signature_data text,        -- data URL of signature image (optional)
  decided_at timestamptz,
  decided_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wms_appr_txn ON public.wms_approvals(transaction_id);
CREATE INDEX IF NOT EXISTS idx_wms_appr_status ON public.wms_approvals(status);

ALTER TABLE public.wms_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wms_appr_read" ON public.wms_approvals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wms_appr_block_anon" ON public.wms_approvals
  FOR SELECT TO anon USING (false);

CREATE POLICY "wms_appr_write" ON public.wms_approvals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'manager'::app_role));

CREATE TRIGGER trg_wms_appr_updated
  BEFORE UPDATE ON public.wms_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
