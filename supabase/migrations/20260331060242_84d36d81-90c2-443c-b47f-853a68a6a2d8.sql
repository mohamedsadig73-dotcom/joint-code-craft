-- Remove sensitive tables from Realtime publication
DO $$
BEGIN
  -- Check if user_roles is in the publication before dropping
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;
  END IF;

  -- Check if leave_tracking is in the publication before dropping
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leave_tracking'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.leave_tracking;
  END IF;
END $$;