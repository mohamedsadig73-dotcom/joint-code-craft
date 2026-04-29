-- 1. Add declaration link column
ALTER TABLE public.inv_transactions
  ADD COLUMN IF NOT EXISTS declaration_id text REFERENCES public.declarations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inv_transactions_declaration ON public.inv_transactions(declaration_id);

-- 2. Function to generate declaration ID matching existing format (IN-YYYY-0000 / OUT-YYYY-0000)
CREATE OR REPLACE FUNCTION public.generate_declaration_id(_type declaration_type)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_year text;
  v_seq int;
BEGIN
  v_prefix := CASE _type WHEN 'دخول' THEN 'IN' WHEN 'خروج' THEN 'OUT' END;
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(id, '-', 3) AS INT)), 0) + 1
  INTO v_seq FROM public.declarations
  WHERE id LIKE v_prefix || '-' || v_year || '-%';
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

-- 3. Trigger function: auto-create declaration when posting IN/OUT
CREATE OR REPLACE FUNCTION public.auto_create_declaration_for_inv_txn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decl_type declaration_type;
  v_decl_id text;
  v_user_id uuid;
BEGIN
  -- Only on transition to 'posted', only for in/out, only if not already linked
  IF NEW.status = 'posted'
     AND (OLD.status IS NULL OR OLD.status <> 'posted')
     AND NEW.txn_type IN ('in','out')
     AND NEW.declaration_id IS NULL THEN

    v_decl_type := CASE NEW.txn_type WHEN 'in' THEN 'دخول'::declaration_type ELSE 'خروج'::declaration_type END;
    v_decl_id := generate_declaration_id(v_decl_type);
    v_user_id := COALESCE(NEW.posted_by, NEW.created_by, auth.uid());

    -- sender_id is NOT NULL — fall back to created_by if needed
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Cannot auto-create declaration: no user context';
    END IF;

    INSERT INTO public.declarations (id, type, status, sender_id, notes)
    VALUES (
      v_decl_id,
      v_decl_type,
      'draft'::declaration_status,
      v_user_id,
      'تم إنشاؤه تلقائياً من حركة المخزون ' || NEW.txn_no
    );

    NEW.declaration_id := v_decl_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Attach trigger BEFORE the existing apply trigger so declaration_id is set on the same UPDATE
DROP TRIGGER IF EXISTS trg_inv_txn_auto_declaration ON public.inv_transactions;
CREATE TRIGGER trg_inv_txn_auto_declaration
BEFORE UPDATE ON public.inv_transactions
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_declaration_for_inv_txn();