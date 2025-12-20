-- جدول إعدادات 2FA للمستخدمين
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  method TEXT DEFAULT 'email' CHECK (method IN ('email', 'totp')),
  totp_secret TEXT,
  backup_codes TEXT[],
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- جدول رموز التحقق المؤقتة
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('2fa', 'email_verification', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول سجلات الامتثال
CREATE TABLE IF NOT EXISTS public.compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT NOT NULL CHECK (log_type IN ('haccp', 'fda', 'gdpr', 'audit', 'temperature', 'quality')),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'resolved')),
  related_entity_type TEXT,
  related_entity_id TEXT,
  data JSONB,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id)
);

-- جدول فحوصات HACCP
CREATE TABLE IF NOT EXISTS public.haccp_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_point TEXT NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('ccp', 'oprp', 'prp')),
  location_id UUID REFERENCES public.wms_locations(id),
  temperature_reading DECIMAL,
  humidity_reading DECIMAL,
  is_compliant BOOLEAN DEFAULT true,
  deviation_notes TEXT,
  corrective_action TEXT,
  verified_by UUID REFERENCES public.profiles(id),
  verification_date TIMESTAMPTZ DEFAULT now(),
  next_check_due TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول طلبات GDPR (حذف البيانات / تصدير البيانات)
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL CHECK (request_type IN ('data_export', 'data_deletion', 'data_rectification', 'consent_withdrawal')),
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  notes TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  data_exported_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_2fa_settings
CREATE POLICY "Users can view own 2FA settings"
ON public.user_2fa_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA settings"
ON public.user_2fa_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA settings"
ON public.user_2fa_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for verification_codes
CREATE POLICY "Users can view own verification codes"
ON public.verification_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification codes"
ON public.verification_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification codes"
ON public.verification_codes FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for compliance_logs (admin/manager only)
CREATE POLICY "Admins and managers can view compliance logs"
ON public.compliance_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins and managers can insert compliance logs"
ON public.compliance_logs FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can update compliance logs"
ON public.compliance_logs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for haccp_checks
CREATE POLICY "Authenticated users can view HACCP checks"
ON public.haccp_checks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and managers can insert HACCP checks"
ON public.haccp_checks FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins and managers can update HACCP checks"
ON public.haccp_checks FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- RLS Policies for gdpr_requests
CREATE POLICY "Admins can view all GDPR requests"
ON public.gdpr_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage GDPR requests"
ON public.gdpr_requests FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to generate verification code
CREATE OR REPLACE FUNCTION public.generate_verification_code(
  _user_id UUID,
  _type TEXT DEFAULT '2fa'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code TEXT;
BEGIN
  -- Generate 6-digit code
  _code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Delete old unused codes
  DELETE FROM verification_codes 
  WHERE user_id = _user_id 
    AND type = _type 
    AND used_at IS NULL;
  
  -- Insert new code (expires in 10 minutes)
  INSERT INTO verification_codes (user_id, code, type, expires_at)
  VALUES (_user_id, _code, _type, NOW() + INTERVAL '10 minutes');
  
  RETURN _code;
END;
$$;

-- Function to verify code
CREATE OR REPLACE FUNCTION public.verify_code(
  _user_id UUID,
  _code TEXT,
  _type TEXT DEFAULT '2fa'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _valid BOOLEAN;
BEGIN
  UPDATE verification_codes
  SET used_at = NOW()
  WHERE user_id = _user_id
    AND code = _code
    AND type = _type
    AND expires_at > NOW()
    AND used_at IS NULL
  RETURNING TRUE INTO _valid;
  
  RETURN COALESCE(_valid, FALSE);
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_type ON verification_codes(user_id, type);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_type ON compliance_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_haccp_checks_location ON haccp_checks(location_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);