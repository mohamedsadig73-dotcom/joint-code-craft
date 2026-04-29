
-- Enums
CREATE TYPE public.inv_txn_type AS ENUM ('in', 'out', 'transfer', 'return');
CREATE TYPE public.inv_txn_status AS ENUM ('draft', 'posted', 'cancelled');
CREATE TYPE public.inv_party_type AS ENUM ('employee', 'department', 'supplier', 'external');

-- 1. Locations
CREATE TABLE public.inv_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  parent_id uuid REFERENCES public.inv_locations(id) ON DELETE SET NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, code)
);

-- 2. Stock balances
CREATE TABLE public.inv_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items_master(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.inv_locations(id) ON DELETE SET NULL,
  qty numeric NOT NULL DEFAULT 0,
  last_movement_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_inv_stock ON public.inv_stock(item_id, warehouse_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. Custody
CREATE TABLE public.inv_custody (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items_master(id) ON DELETE CASCADE,
  party_type inv_party_type NOT NULL,
  party_name text NOT NULL,
  party_ref text,
  qty numeric NOT NULL DEFAULT 0,
  last_movement_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, party_type, party_name)
);

-- 4. Transactions
CREATE TABLE public.inv_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_no text NOT NULL UNIQUE,
  txn_type inv_txn_type NOT NULL,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  status inv_txn_status NOT NULL DEFAULT 'draft',
  from_warehouse_id uuid REFERENCES public.warehouses(id),
  from_location_id uuid REFERENCES public.inv_locations(id),
  to_warehouse_id uuid REFERENCES public.warehouses(id),
  to_location_id uuid REFERENCES public.inv_locations(id),
  party_type inv_party_type,
  party_name text,
  party_ref text,
  reference text,
  notes text,
  linked_box_receipt_id uuid REFERENCES public.box_receipts(id) ON DELETE SET NULL,
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_inv_txn_type_date ON public.inv_transactions(txn_type, txn_date DESC);
CREATE INDEX idx_inv_txn_status ON public.inv_transactions(status);

-- 5. Transaction items
CREATE TABLE public.inv_transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.inv_transactions(id) ON DELETE CASCADE,
  line_no int NOT NULL DEFAULT 1,
  item_id uuid NOT NULL REFERENCES public.items_master(id),
  qty numeric NOT NULL CHECK (qty > 0),
  unit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_txn_items_txn ON public.inv_transaction_items(transaction_id);
CREATE INDEX idx_inv_txn_items_item ON public.inv_transaction_items(item_id);

-- Link to box_receipts
ALTER TABLE public.box_receipts 
  ADD COLUMN IF NOT EXISTS inv_transaction_id uuid REFERENCES public.inv_transactions(id) ON DELETE SET NULL;

-- ============ RLS ============
ALTER TABLE public.inv_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_loc_read" ON public.inv_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv_loc_write" ON public.inv_locations FOR ALL TO authenticated 
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

CREATE POLICY "inv_stock_read" ON public.inv_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv_stock_admin" ON public.inv_stock FOR ALL TO authenticated 
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "inv_cust_read" ON public.inv_custody FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv_cust_admin" ON public.inv_custody FOR ALL TO authenticated 
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "inv_txn_read" ON public.inv_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv_txn_insert" ON public.inv_transactions FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "inv_txn_update" ON public.inv_transactions FOR UPDATE TO authenticated 
  USING (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') 
    OR (created_by = auth.uid() AND status = 'draft')
  );
CREATE POLICY "inv_txn_delete" ON public.inv_transactions FOR DELETE TO authenticated 
  USING (has_role(auth.uid(),'admin'));

CREATE POLICY "inv_txn_items_read" ON public.inv_transaction_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv_txn_items_write" ON public.inv_transaction_items FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM inv_transactions t WHERE t.id = transaction_id 
      AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') 
           OR (t.created_by = auth.uid() AND t.status = 'draft')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM inv_transactions t WHERE t.id = transaction_id 
      AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') 
           OR (t.created_by = auth.uid() AND t.status = 'draft')))
  );

-- ============ Functions ============
CREATE OR REPLACE FUNCTION public.generate_inv_txn_no(_type inv_txn_type)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_prefix text; v_year text; v_seq int;
BEGIN
  v_prefix := CASE _type WHEN 'in' THEN 'IN' WHEN 'out' THEN 'OUT' 
                         WHEN 'transfer' THEN 'TRF' WHEN 'return' THEN 'RET' END;
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(txn_no, '-', 3) AS INT)), 0) + 1
  INTO v_seq FROM inv_transactions
  WHERE txn_no LIKE v_prefix || '-' || v_year || '-%';
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_inv_txn_no()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.txn_no IS NULL OR NEW.txn_no = '' THEN
    NEW.txn_no := generate_inv_txn_no(NEW.txn_type);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inv_txn_no BEFORE INSERT ON public.inv_transactions
  FOR EACH ROW EXECUTE FUNCTION set_inv_txn_no();

CREATE TRIGGER trg_inv_loc_updated BEFORE UPDATE ON public.inv_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_inv_txn_updated BEFORE UPDATE ON public.inv_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_inv_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status <> 'posted') THEN
    IF NEW.txn_type = 'in' AND NEW.to_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Receipt (IN) requires destination warehouse';
    END IF;
    IF NEW.txn_type = 'out' AND NEW.from_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Issue (OUT) requires source warehouse';
    END IF;
    IF NEW.txn_type = 'out' AND (NEW.party_type IS NULL OR NEW.party_name IS NULL) THEN
      RAISE EXCEPTION 'Issue (OUT) requires recipient';
    END IF;
    IF NEW.txn_type = 'transfer' AND (NEW.from_warehouse_id IS NULL OR NEW.to_warehouse_id IS NULL) THEN
      RAISE EXCEPTION 'Transfer requires both source and destination';
    END IF;
    IF NEW.txn_type = 'return' AND NEW.to_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Return requires destination warehouse';
    END IF;
    IF NEW.txn_type = 'return' AND (NEW.party_type IS NULL OR NEW.party_name IS NULL) THEN
      RAISE EXCEPTION 'Return requires party';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inv_transaction_items WHERE transaction_id = NEW.id) THEN
      RAISE EXCEPTION 'Cannot post transaction without items';
    END IF;
    NEW.posted_at := now();
    NEW.posted_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inv_txn_validate BEFORE UPDATE ON public.inv_transactions
  FOR EACH ROW EXECUTE FUNCTION validate_inv_transaction();

-- Apply transaction
CREATE OR REPLACE FUNCTION public.apply_inv_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_line RECORD;
  v_existing_id uuid;
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status <> 'posted') THEN
    FOR v_line IN SELECT * FROM inv_transaction_items WHERE transaction_id = NEW.id ORDER BY line_no LOOP
      
      IF NEW.txn_type = 'in' THEN
        SELECT id INTO v_existing_id FROM inv_stock 
          WHERE item_id = v_line.item_id AND warehouse_id = NEW.to_warehouse_id 
            AND COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.to_location_id, '00000000-0000-0000-0000-000000000000'::uuid);
        IF v_existing_id IS NOT NULL THEN
          UPDATE inv_stock SET qty = qty + v_line.qty, last_movement_at = now(), updated_at = now() WHERE id = v_existing_id;
        ELSE
          INSERT INTO inv_stock(item_id, warehouse_id, location_id, qty, last_movement_at)
          VALUES (v_line.item_id, NEW.to_warehouse_id, NEW.to_location_id, v_line.qty, now());
        END IF;
      
      ELSIF NEW.txn_type = 'out' THEN
        SELECT id INTO v_existing_id FROM inv_stock 
          WHERE item_id = v_line.item_id AND warehouse_id = NEW.from_warehouse_id 
            AND COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.from_location_id, '00000000-0000-0000-0000-000000000000'::uuid);
        IF v_existing_id IS NOT NULL THEN
          UPDATE inv_stock SET qty = qty - v_line.qty, last_movement_at = now(), updated_at = now() WHERE id = v_existing_id;
        ELSE
          INSERT INTO inv_stock(item_id, warehouse_id, location_id, qty, last_movement_at)
          VALUES (v_line.item_id, NEW.from_warehouse_id, NEW.from_location_id, -v_line.qty, now());
        END IF;
        
        INSERT INTO inv_custody(item_id, party_type, party_name, party_ref, qty, last_movement_at)
        VALUES (v_line.item_id, NEW.party_type, NEW.party_name, NEW.party_ref, v_line.qty, now())
        ON CONFLICT (item_id, party_type, party_name) DO UPDATE
          SET qty = inv_custody.qty + v_line.qty, 
              party_ref = COALESCE(EXCLUDED.party_ref, inv_custody.party_ref),
              last_movement_at = now(), updated_at = now();
      
      ELSIF NEW.txn_type = 'transfer' THEN
        SELECT id INTO v_existing_id FROM inv_stock 
          WHERE item_id = v_line.item_id AND warehouse_id = NEW.from_warehouse_id 
            AND COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.from_location_id, '00000000-0000-0000-0000-000000000000'::uuid);
        IF v_existing_id IS NOT NULL THEN
          UPDATE inv_stock SET qty = qty - v_line.qty, last_movement_at = now(), updated_at = now() WHERE id = v_existing_id;
        ELSE
          INSERT INTO inv_stock(item_id, warehouse_id, location_id, qty, last_movement_at)
          VALUES (v_line.item_id, NEW.from_warehouse_id, NEW.from_location_id, -v_line.qty, now());
        END IF;
        
        SELECT id INTO v_existing_id FROM inv_stock 
          WHERE item_id = v_line.item_id AND warehouse_id = NEW.to_warehouse_id 
            AND COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.to_location_id, '00000000-0000-0000-0000-000000000000'::uuid);
        IF v_existing_id IS NOT NULL THEN
          UPDATE inv_stock SET qty = qty + v_line.qty, last_movement_at = now(), updated_at = now() WHERE id = v_existing_id;
        ELSE
          INSERT INTO inv_stock(item_id, warehouse_id, location_id, qty, last_movement_at)
          VALUES (v_line.item_id, NEW.to_warehouse_id, NEW.to_location_id, v_line.qty, now());
        END IF;
      
      ELSIF NEW.txn_type = 'return' THEN
        INSERT INTO inv_custody(item_id, party_type, party_name, party_ref, qty, last_movement_at)
        VALUES (v_line.item_id, NEW.party_type, NEW.party_name, NEW.party_ref, -v_line.qty, now())
        ON CONFLICT (item_id, party_type, party_name) DO UPDATE
          SET qty = inv_custody.qty - v_line.qty, last_movement_at = now(), updated_at = now();
        
        SELECT id INTO v_existing_id FROM inv_stock 
          WHERE item_id = v_line.item_id AND warehouse_id = NEW.to_warehouse_id 
            AND COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.to_location_id, '00000000-0000-0000-0000-000000000000'::uuid);
        IF v_existing_id IS NOT NULL THEN
          UPDATE inv_stock SET qty = qty + v_line.qty, last_movement_at = now(), updated_at = now() WHERE id = v_existing_id;
        ELSE
          INSERT INTO inv_stock(item_id, warehouse_id, location_id, qty, last_movement_at)
          VALUES (v_line.item_id, NEW.to_warehouse_id, NEW.to_location_id, v_line.qty, now());
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inv_txn_apply AFTER UPDATE ON public.inv_transactions
  FOR EACH ROW EXECUTE FUNCTION apply_inv_transaction();

-- Audit
CREATE OR REPLACE FUNCTION public.audit_inv_transactions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_audit_event('CREATE', 'inv_transactions', NEW.id::text, NULL, row_to_json(NEW)::jsonb);
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM log_audit_event('UPDATE', 'inv_transactions', NEW.id::text, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM log_audit_event('DELETE', 'inv_transactions', OLD.id::text, row_to_json(OLD)::jsonb, NULL);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_inv_txn_audit AFTER INSERT OR UPDATE OR DELETE ON public.inv_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_inv_transactions();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inv_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inv_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inv_custody;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inv_locations;
