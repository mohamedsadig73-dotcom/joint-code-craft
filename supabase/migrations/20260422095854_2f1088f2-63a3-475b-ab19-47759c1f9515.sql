-- Create update_logs table for tracking desktop/web update attempts
CREATE TABLE public.update_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  app_version TEXT,
  shell_version TEXT,
  target_version TEXT,
  attempted_url TEXT,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_update_logs_user_id ON public.update_logs(user_id);
CREATE INDEX idx_update_logs_created_at ON public.update_logs(created_at DESC);
CREATE INDEX idx_update_logs_status ON public.update_logs(status);
CREATE INDEX idx_update_logs_phase ON public.update_logs(phase);

ALTER TABLE public.update_logs ENABLE ROW LEVEL SECURITY;

-- Block anon
CREATE POLICY "Block anonymous access to update_logs"
ON public.update_logs FOR SELECT
TO anon
USING (false);

-- Users can view their own logs
CREATE POLICY "Users can view own update logs"
ON public.update_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all update logs"
ON public.update_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert their own logs
CREATE POLICY "Users can insert own update logs"
ON public.update_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can delete old logs
CREATE POLICY "Admins can delete update logs"
ON public.update_logs FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));