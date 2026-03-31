
-- ============================================================
-- FIX 1: Remove anonymous upload policy from desktop-releases
-- ============================================================
DROP POLICY IF EXISTS "Allow public upload to desktop-releases" ON storage.objects;

-- ============================================================
-- FIX 2: Fix verification_codes - remove client UPDATE policy
-- All verification goes through SECURITY DEFINER functions
-- ============================================================
DROP POLICY IF EXISTS "Users can update own verification codes" ON public.verification_codes;

-- Ensure RLS is enabled (no SELECT/INSERT/UPDATE policies for clients)
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIX 3: Hash 2FA backup codes using pgcrypto
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.hash_backup_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.backup_codes IS NOT NULL THEN
    NEW.backup_codes := ARRAY(
      SELECT 
        CASE 
          WHEN code LIKE '$2a$%' OR code LIKE '$2b$%' THEN code
          ELSE crypt(code, gen_salt('bf', 8))
        END
      FROM unnest(NEW.backup_codes) AS code
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_backup_codes_trigger ON public.user_2fa_settings;
CREATE TRIGGER hash_backup_codes_trigger
  BEFORE INSERT OR UPDATE OF backup_codes ON public.user_2fa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_backup_codes();

CREATE OR REPLACE FUNCTION public.verify_backup_code(_user_id uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _codes text[];
  _i int;
BEGIN
  SELECT backup_codes INTO _codes
  FROM user_2fa_settings
  WHERE user_id = _user_id AND is_enabled = true;
  
  IF _codes IS NULL THEN
    RETURN false;
  END IF;
  
  FOR _i IN 1..array_length(_codes, 1) LOOP
    IF _codes[_i] IS NOT NULL AND crypt(_code, _codes[_i]) = _codes[_i] THEN
      _codes[_i] := NULL;
      UPDATE user_2fa_settings 
      SET backup_codes = array_remove(_codes, NULL)
      WHERE user_id = _user_id;
      RETURN true;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$;

-- ============================================================
-- FIX 4: Add GDPR self-service policies
-- ============================================================
CREATE POLICY "Users can submit own GDPR requests"
ON public.gdpr_requests
FOR INSERT
TO authenticated
WITH CHECK (
  requester_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can view own GDPR requests"
ON public.gdpr_requests
FOR SELECT
TO authenticated
USING (
  requester_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can view all GDPR requests" ON public.gdpr_requests;
