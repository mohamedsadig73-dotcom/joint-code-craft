ALTER TABLE public.item_image_history
  ADD COLUMN IF NOT EXISTS notes text;