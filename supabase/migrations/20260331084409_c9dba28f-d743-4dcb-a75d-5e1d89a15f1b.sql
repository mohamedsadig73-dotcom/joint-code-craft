
-- Update functions to use extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.hash_backup_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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

CREATE OR REPLACE FUNCTION public.verify_backup_code(_user_id uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
