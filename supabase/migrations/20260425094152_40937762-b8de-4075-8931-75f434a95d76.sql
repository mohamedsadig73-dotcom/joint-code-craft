-- Enable realtime for boxes management tables so UI updates instantly without refresh
ALTER TABLE public.box_receipts REPLICA IDENTITY FULL;
ALTER TABLE public.shipping_containers REPLICA IDENTITY FULL;
ALTER TABLE public.container_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='box_receipts') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.box_receipts';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='shipping_containers') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_containers';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='container_items') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.container_items';
  END IF;
END $$;