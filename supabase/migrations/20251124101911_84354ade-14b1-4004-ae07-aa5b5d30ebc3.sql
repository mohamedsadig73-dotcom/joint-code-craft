-- Drop the old manager delete policy
DROP POLICY IF EXISTS "Managers can delete declarations" ON public.declarations;

-- Create new policy that allows managers to delete only their own declarations
CREATE POLICY "Managers can delete own declarations"
ON public.declarations
FOR DELETE
USING (
  has_role(auth.uid(), 'manager') AND 
  sender_id = auth.uid()
);