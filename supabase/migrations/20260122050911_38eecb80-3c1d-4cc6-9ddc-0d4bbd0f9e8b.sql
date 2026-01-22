-- Add RLS policy for profile deletion (Admin only)
CREATE POLICY "Only admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for profile insertion (system/admin)
CREATE POLICY "System can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);