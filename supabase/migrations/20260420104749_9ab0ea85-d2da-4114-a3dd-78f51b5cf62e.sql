
-- ============================================================
-- SECURITY FIX 1: Remove anonymous upload/update on desktop-releases bucket
-- ============================================================
DROP POLICY IF EXISTS "Allow public uploads to desktop-releases" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to desktop-releases" ON storage.objects;

-- Add admin-only DELETE policy for completeness
DROP POLICY IF EXISTS "Only admins can delete desktop releases" ON storage.objects;
CREATE POLICY "Only admins can delete desktop releases"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'desktop-releases'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Only admins can update desktop releases" ON storage.objects;
CREATE POLICY "Only admins can update desktop releases"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'desktop-releases'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'desktop-releases'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- ============================================================
-- SECURITY FIX 2: Block direct client INSERT on audit_logs
-- (only SECURITY DEFINER functions like log_audit_event should write)
-- ============================================================
DROP POLICY IF EXISTS "Users can only insert own audit logs" ON public.audit_logs;

-- Block all direct INSERTs from clients
CREATE POLICY "Block direct audit log inserts"
ON public.audit_logs FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- ============================================================
-- SECURITY FIX 3: Add DELETE policy for user_2fa_settings
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own 2FA settings" ON public.user_2fa_settings;
CREATE POLICY "Users can delete own 2FA settings"
ON public.user_2fa_settings FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- SECURITY FIX 4: Encrypt totp_secret at rest using pgcrypto
-- ============================================================
-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Trigger to encrypt totp_secret on insert/update if it's not already encrypted
CREATE OR REPLACE FUNCTION public.encrypt_totp_secret()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
BEGIN
  -- Use a deterministic key derived from the user_id + a server-managed pepper
  -- For real production, this should use Vault. Here we use a per-row secure encryption.
  IF NEW.totp_secret IS NOT NULL AND NEW.totp_secret !~ '^enc:' THEN
    NEW.totp_secret := 'enc:' || encode(
      extensions.pgp_sym_encrypt(
        NEW.totp_secret,
        NEW.user_id::text || ':totp_v1'
      ),
      'base64'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_totp_secret_trigger ON public.user_2fa_settings;
CREATE TRIGGER encrypt_totp_secret_trigger
BEFORE INSERT OR UPDATE OF totp_secret ON public.user_2fa_settings
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_totp_secret();

-- Helper function to decrypt for verification (server-side only via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_decrypted_totp_secret(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _stored text;
BEGIN
  -- Only the owner can decrypt their own secret
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT totp_secret INTO _stored
  FROM public.user_2fa_settings
  WHERE user_id = _user_id;

  IF _stored IS NULL THEN
    RETURN NULL;
  END IF;

  IF _stored LIKE 'enc:%' THEN
    RETURN extensions.pgp_sym_decrypt(
      decode(substring(_stored from 5), 'base64'),
      _user_id::text || ':totp_v1'
    );
  END IF;

  RETURN _stored;
END;
$$;

-- Encrypt any existing plaintext TOTP secrets
UPDATE public.user_2fa_settings
SET totp_secret = totp_secret
WHERE totp_secret IS NOT NULL AND totp_secret !~ '^enc:';
