-- Drop old permissive storage upload policies
DROP POLICY IF EXISTS "Authenticated users can upload desktop releases" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload releases" ON storage.objects;

-- Create admin-only upload policies
CREATE POLICY "Only admins can upload desktop releases"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'desktop-releases'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only admins can upload app releases"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'app-releases'
  AND public.has_role(auth.uid(), 'admin')
);