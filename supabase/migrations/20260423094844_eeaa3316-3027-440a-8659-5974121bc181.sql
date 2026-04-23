
-- Item Image History: tracks every upload, replace, and delete for item images.
CREATE TABLE public.item_image_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items_master(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('upload', 'replace', 'remove')),
  old_path TEXT,
  new_path TEXT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_image_history_item ON public.item_image_history(item_id, changed_at DESC);

ALTER TABLE public.item_image_history ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view image history
CREATE POLICY "Authenticated can view item image history"
  ON public.item_image_history FOR SELECT
  TO authenticated
  USING (true);

-- Block anonymous
CREATE POLICY "Block anonymous from item image history"
  ON public.item_image_history FOR SELECT
  TO anon
  USING (false);

-- Admins and managers can insert (used by trigger via SECURITY DEFINER, but allow direct inserts too)
CREATE POLICY "Admins and managers can log image history"
  ON public.item_image_history FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Trigger function: auto-log when items_master.image_path changes
CREATE OR REPLACE FUNCTION public.log_item_image_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.image_path IS NOT NULL THEN
      INSERT INTO public.item_image_history (item_id, action, old_path, new_path, changed_by)
      VALUES (NEW.id, 'upload', NULL, NEW.image_path, auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.image_path, '') IS DISTINCT FROM COALESCE(OLD.image_path, '') THEN
      IF OLD.image_path IS NULL AND NEW.image_path IS NOT NULL THEN
        v_action := 'upload';
      ELSIF OLD.image_path IS NOT NULL AND NEW.image_path IS NULL THEN
        v_action := 'remove';
      ELSE
        v_action := 'replace';
      END IF;
      INSERT INTO public.item_image_history (item_id, action, old_path, new_path, changed_by)
      VALUES (NEW.id, v_action, OLD.image_path, NEW.image_path, auth.uid());
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_item_image_change
  AFTER INSERT OR UPDATE OF image_path ON public.items_master
  FOR EACH ROW EXECUTE FUNCTION public.log_item_image_change();
