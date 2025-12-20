-- =============================================
-- SECTION 1: FIX RATE LIMIT TRACKING RLS
-- =============================================
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limit_tracking;

-- Create a restrictive policy that only allows service role operations
-- (No authenticated user policies - only service role can access)
-- RLS will block all client-side access, service role bypasses RLS

-- =============================================
-- SECTION 2: FIX AUDIT LOGS - Ensure proper restrictions
-- =============================================
-- audit_logs should only be insertable by system/triggers, not directly by users
-- The existing policies look correct but let's ensure they are properly set

-- =============================================
-- SECTION 3: MOVE EXTENSIONS OUT OF PUBLIC SCHEMA
-- =============================================
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to authenticated and anon roles
GRANT USAGE ON SCHEMA extensions TO authenticated, anon;

-- Move uuid-ossp extension to extensions schema (if it exists in public)
DROP EXTENSION IF EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Move pgcrypto extension to extensions schema (if it exists in public)  
DROP EXTENSION IF EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;