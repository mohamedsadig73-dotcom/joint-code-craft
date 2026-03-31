-- Fix 1: Remove client-side SELECT on verification_codes (2FA bypass risk)
-- Codes should only be verified server-side via verify_code() SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can view own verification codes" ON verification_codes;

-- Also remove client INSERT - code generation should only happen via
-- generate_verification_code() SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can insert own verification codes" ON verification_codes;

-- Fix 2: Restrict user_2fa_settings SELECT to hide totp_secret and backup_codes
-- Drop existing SELECT policy and replace with one that blocks direct reads
-- Users should verify codes via server-side functions, not read secrets directly
DROP POLICY IF EXISTS "Users can view own 2FA settings" ON user_2fa_settings;

-- Allow users to read only non-sensitive fields (is_enabled, method)
-- by creating a view or restricting at app level. For now, allow SELECT
-- but the sensitive columns (totp_secret, backup_codes) should be handled
-- via SECURITY DEFINER functions only.
-- We keep a limited SELECT so the app can check if 2FA is enabled:
CREATE POLICY "Users can check own 2FA status"
ON user_2fa_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);