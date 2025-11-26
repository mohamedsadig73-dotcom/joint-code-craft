-- Enable permanent deletion for admins
CREATE POLICY "Admins can permanently delete declarations"
ON public.declarations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));