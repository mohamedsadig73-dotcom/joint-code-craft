-- Allow admins and managers to insert notifications
CREATE POLICY "Admins and managers can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);