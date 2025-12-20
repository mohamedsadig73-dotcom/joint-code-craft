-- Block anonymous access to sensitive tables
-- Add explicit policies to ensure only authenticated users can access data

-- Block anonymous access to profiles
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to declarations  
CREATE POLICY "Block anonymous access to declarations"
ON public.declarations
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to maintenance_vendors
CREATE POLICY "Block anonymous access to vendors"
ON public.maintenance_vendors
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to audit_logs
CREATE POLICY "Block anonymous access to audit_logs"
ON public.audit_logs
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to user_roles
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to notifications
CREATE POLICY "Block anonymous access to notifications"
ON public.notifications
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to rate_limit_tracking
CREATE POLICY "Block anonymous access to rate_limits"
ON public.rate_limit_tracking
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to declaration_status_history
CREATE POLICY "Block anonymous access to status_history"
ON public.declaration_status_history
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to declaration_deletion_log
CREATE POLICY "Block anonymous access to deletion_log"
ON public.declaration_deletion_log
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to maintenance tables
CREATE POLICY "Block anonymous access to maintenance_items"
ON public.maintenance_items
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to maintenance_schedule"
ON public.maintenance_schedule
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to maintenance_assets"
ON public.maintenance_assets
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to maintenance_attachments"
ON public.maintenance_attachments
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to archive_files"
ON public.archive_files
FOR SELECT
TO anon
USING (false);