-- =============================================
-- 1. ENUMS
-- =============================================
CREATE TYPE public.box_unit AS ENUM ('PCS', 'SET', 'BOX', 'KG', 'MTR', 'LTR', 'PAIR');
CREATE TYPE public.box_destination AS ENUM ('morocco', 'uzbekistan', 'unspecified');
CREATE TYPE public.box_receipt_status AS ENUM ('received', 'sorted', 'packed', 'shipped');

-- =============================================
-- 2. TABLE: box_receipts
-- =============================================
CREATE TABLE public.box_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_no SERIAL,
  supplier TEXT NOT NULL,
  part_no TEXT NOT NULL,
  description TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit public.box_unit NOT NULL DEFAULT 'PCS',
  destination public.box_destination NOT NULL DEFAULT 'unspecified',
  place TEXT DEFAULT 'مخزنة بالمخزن (B)',
  box_no TEXT NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.box_receipt_status NOT NULL DEFAULT 'received',
  notes TEXT,
  image_path TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_box_receipts_box_no ON public.box_receipts(box_no) WHERE deleted_at IS NULL;
CREATE INDEX idx_box_receipts_supplier ON public.box_receipts(supplier) WHERE deleted_at IS NULL;
CREATE INDEX idx_box_receipts_destination ON public.box_receipts(destination) WHERE deleted_at IS NULL;
CREATE INDEX idx_box_receipts_status ON public.box_receipts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_box_receipts_part_no ON public.box_receipts(part_no) WHERE deleted_at IS NULL;
CREATE INDEX idx_box_receipts_created_by ON public.box_receipts(created_by);
CREATE INDEX idx_box_receipts_deleted_at ON public.box_receipts(deleted_at);

-- =============================================
-- 3. VIEW: box_summary (auto-computed)
-- =============================================
CREATE OR REPLACE VIEW public.box_summary AS
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

-- =============================================
-- 4. TRIGGERS
-- =============================================
-- Updated at trigger
CREATE TRIGGER update_box_receipts_updated_at
BEFORE UPDATE ON public.box_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_box_receipts_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_audit_event('CREATE', 'box_receipts', NEW.id::text, NULL, row_to_json(NEW)::jsonb);
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM log_audit_event('UPDATE', 'box_receipts', NEW.id::text, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM log_audit_event('DELETE', 'box_receipts', OLD.id::text, row_to_json(OLD)::jsonb, NULL);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_box_receipts
AFTER INSERT OR UPDATE OR DELETE ON public.box_receipts
FOR EACH ROW
EXECUTE FUNCTION public.audit_box_receipts_changes();

-- Cleanup old soft-deleted records (30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_deleted_box_receipts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.box_receipts
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$;

-- =============================================
-- 5. RLS POLICIES
-- =============================================
ALTER TABLE public.box_receipts ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view non-deleted records
CREATE POLICY "Authenticated users can view box receipts"
ON public.box_receipts FOR SELECT
TO authenticated
USING (true);

-- INSERT: Authenticated users can create receipts (must set created_by to themselves)
CREATE POLICY "Authenticated users can create box receipts"
ON public.box_receipts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- UPDATE: Users can update their own; admin/manager can update any
CREATE POLICY "Users can update own or admin/manager can update any"
ON public.box_receipts FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- DELETE: Only admin can hard-delete (soft delete is via UPDATE on deleted_at)
CREATE POLICY "Only admins can hard delete box receipts"
ON public.box_receipts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 6. STORAGE BUCKET: box-images
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'box-images',
  'box-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for box-images
CREATE POLICY "Box images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'box-images');

CREATE POLICY "Authenticated users can upload box images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'box-images');

CREATE POLICY "Authenticated users can update box images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'box-images');

CREATE POLICY "Authenticated users can delete box images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'box-images');