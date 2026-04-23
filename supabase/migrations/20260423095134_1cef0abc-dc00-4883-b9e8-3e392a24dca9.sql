ALTER TABLE public.items_master REPLICA IDENTITY FULL;
ALTER TABLE public.item_image_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.items_master;
ALTER PUBLICATION supabase_realtime ADD TABLE public.item_image_history;