-- ============================================================
-- 1) Hide TOTP secret + backup codes from client SELECT
-- ============================================================
-- Drop the over-broad self-SELECT policy
DROP POLICY IF EXISTS "Users can check own 2FA status" ON public.user_2fa_settings;

-- Revoke direct table SELECT from API roles to prevent any direct reads
REVOKE SELECT ON public.user_2fa_settings FROM anon, authenticated;

-- Provide a safe view that exposes only non-secret columns to the user
CREATE OR REPLACE VIEW public.user_2fa_status
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  is_enabled,
  method,
  last_verified_at,
  created_at,
  updated_at
FROM public.user_2fa_settings
WHERE user_id = auth.uid();

GRANT SELECT ON public.user_2fa_status TO authenticated;

-- ============================================================
-- 2) Add deny-all policies on verification_codes
-- (Only SECURITY DEFINER functions / service role should access it)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='verification_codes') THEN
    EXECUTE 'REVOKE ALL ON public.verification_codes FROM anon, authenticated';

    -- Explicit deny policies so the linter sees policies present
    DROP POLICY IF EXISTS "Block anon access to verification_codes" ON public.verification_codes;
    CREATE POLICY "Block anon access to verification_codes"
      ON public.verification_codes
      FOR SELECT
      TO anon, authenticated
      USING (false);

    DROP POLICY IF EXISTS "Block client writes to verification_codes" ON public.verification_codes;
    CREATE POLICY "Block client writes to verification_codes"
      ON public.verification_codes
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

-- ============================================================
-- 3) Lock down public storage bucket SELECT policies to prevent listing
--    (getPublicUrl uses CDN and bypasses RLS, so direct file access keeps working)
-- ============================================================

-- box-images: switch from anon-allowed broad select to authenticated-only
DROP POLICY IF EXISTS "Box images are publicly viewable" ON storage.objects;
CREATE POLICY "Authenticated can view box images metadata"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'box-images');

-- downloads bucket
DROP POLICY IF EXISTS "Public can view downloads files" ON storage.objects;
CREATE POLICY "Authenticated can view downloads metadata"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'downloads');

-- app-releases bucket
DROP POLICY IF EXISTS "Public read access for app releases" ON storage.objects;
CREATE POLICY "Authenticated can view app releases metadata"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'app-releases');

-- desktop-releases bucket: collapse two duplicate broad policies into one authenticated-only
DROP POLICY IF EXISTS "Allow public read from desktop-releases" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can download desktop releases" ON storage.objects;
CREATE POLICY "Authenticated can view desktop releases metadata"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'desktop-releases');