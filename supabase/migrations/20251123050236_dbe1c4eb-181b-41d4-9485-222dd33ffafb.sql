-- Add foreign key relationship from declaration_status_history.changed_by to profiles.id
-- First, ensure all existing changed_by values reference valid profile ids
-- If there are any orphaned records, this will fail and we need to clean them up first

ALTER TABLE public.declaration_status_history
DROP CONSTRAINT IF EXISTS declaration_status_history_changed_by_fkey;

ALTER TABLE public.declaration_status_history
ADD CONSTRAINT declaration_status_history_changed_by_fkey 
FOREIGN KEY (changed_by) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;