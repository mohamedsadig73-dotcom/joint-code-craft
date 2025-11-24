-- Allow managers to delete declarations
CREATE POLICY "Managers can delete declarations"
ON public.declarations
FOR DELETE
USING (has_role(auth.uid(), 'manager'));

-- Allow admins and managers to view all notifications
CREATE POLICY "Admins and managers can view all notifications"
ON public.notifications
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);