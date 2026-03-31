-- Fix 1: Replace overly permissive profiles INSERT policy
-- Profile creation is handled by handle_new_user trigger (SECURITY DEFINER)
-- so we only need authenticated users to insert their own profile as fallback
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

CREATE POLICY "Users can create own profile"
ON profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Fix 2: Realtime - user_roles was already removed from publication
-- Verify and ensure it stays removed (no action needed if already done)