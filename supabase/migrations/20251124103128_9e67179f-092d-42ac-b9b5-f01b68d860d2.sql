-- Add soft delete columns to declarations table
ALTER TABLE public.declarations 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_by UUID REFERENCES public.profiles(id);

-- Create deletion log table for audit purposes
CREATE TABLE public.declaration_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id TEXT NOT NULL,
  deleted_by UUID NOT NULL REFERENCES public.profiles(id),
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  declaration_type declaration_type,
  declaration_status declaration_status,
  sender_username TEXT,
  archive_number TEXT,
  notes TEXT
);

-- Enable RLS on deletion log
ALTER TABLE public.declaration_deletion_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for deletion log
CREATE POLICY "Admins can view all deletion logs"
ON public.declaration_deletion_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view own deletion logs"
ON public.declaration_deletion_log
FOR SELECT
USING (has_role(auth.uid(), 'manager') AND deleted_by = auth.uid());

CREATE POLICY "System can insert deletion logs"
ON public.declaration_deletion_log
FOR INSERT
WITH CHECK (true);

-- Update existing RLS policies to exclude soft-deleted declarations
DROP POLICY IF EXISTS "Users can view own declarations" ON public.declarations;
DROP POLICY IF EXISTS "Admins and managers can view all declarations" ON public.declarations;

CREATE POLICY "Users can view own declarations"
ON public.declarations
FOR SELECT
USING (auth.uid() = sender_id AND deleted_at IS NULL);

CREATE POLICY "Admins and managers can view all declarations"
ON public.declarations
FOR SELECT
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  AND deleted_at IS NULL
);

-- Policy for viewing deleted declarations (trash bin)
CREATE POLICY "Admins can view deleted declarations"
ON public.declarations
FOR SELECT
USING (has_role(auth.uid(), 'admin') AND deleted_at IS NOT NULL);

CREATE POLICY "Managers can view own deleted declarations"
ON public.declarations
FOR SELECT
USING (
  has_role(auth.uid(), 'manager') 
  AND sender_id = auth.uid() 
  AND deleted_at IS NOT NULL
);

-- Update delete policies to perform soft deletes
DROP POLICY IF EXISTS "Admins can delete declarations" ON public.declarations;
DROP POLICY IF EXISTS "Managers can delete own declarations" ON public.declarations;

CREATE POLICY "Admins can soft delete declarations"
ON public.declarations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can soft delete own declarations"
ON public.declarations
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager') 
  AND sender_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'manager') 
  AND sender_id = auth.uid()
);

-- Function to permanently delete old soft-deleted declarations (30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_deleted_declarations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.declarations
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_deleted_declarations() IS 'Permanently deletes declarations that have been soft-deleted for more than 30 days';