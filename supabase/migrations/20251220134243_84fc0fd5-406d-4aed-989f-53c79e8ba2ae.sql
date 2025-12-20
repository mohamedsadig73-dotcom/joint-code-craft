-- Add a service role only policy for rate_limit_tracking
-- This table should only be accessible via service role (edge functions)
-- RLS being enabled with no policies means only service role can access (which is what we want)

-- However, to be explicit and handle future needs, let's add a comment
COMMENT ON TABLE public.rate_limit_tracking IS 'Rate limiting tracking table - Only accessible via service role in edge functions. No client-side access allowed.';

-- Ensure the table has RLS enabled (it should already)
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner as well for additional security
ALTER TABLE public.rate_limit_tracking FORCE ROW LEVEL SECURITY;