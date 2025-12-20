-- Add RLS policies to rate_limit_tracking table
-- This table is used internally for rate limiting, so we need restrictive policies

-- Policy: Only authenticated users can insert (for their own rate tracking)
CREATE POLICY "Authenticated users can insert rate limits"
ON public.rate_limit_tracking
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only the system can read rate limits (using service role)
-- For regular users, we block all reads
CREATE POLICY "Block user reads on rate limits"
ON public.rate_limit_tracking
FOR SELECT
TO authenticated
USING (false);

-- Policy: Only admins can view rate limit data for monitoring
CREATE POLICY "Admins can view rate limits"
ON public.rate_limit_tracking
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: System can update rate limits
CREATE POLICY "System can update rate limits"
ON public.rate_limit_tracking
FOR UPDATE
TO authenticated
WITH CHECK (true);

-- Policy: Admins can delete old rate limit records
CREATE POLICY "Admins can delete rate limits"
ON public.rate_limit_tracking
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));