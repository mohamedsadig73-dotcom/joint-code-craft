-- =============================================
-- نظام الصيانة الدورية للمخزن
-- =============================================

-- 1. إنشاء Enums للأنواع
CREATE TYPE maintenance_frequency AS ENUM (
  'monthly',          -- شهري
  'quarterly',        -- ربع سنوي
  'semiannual',       -- نصف سنوي
  'annual',           -- سنوي
  'ad_hoc'            -- عند الحاجة
);

CREATE TYPE maintenance_status AS ENUM (
  'pending',          -- مطلوب
  'done',             -- تم التنفيذ
  'not_required',     -- غير مطلوب
  'overdue'           -- متأخر
);

CREATE TYPE maintenance_asset_type AS ENUM (
  'electrical',       -- كهربائي
  'plumbing',         -- سباكة
  'hvac',             -- تكييف وتبريد
  'safety',           -- سلامة
  'equipment',        -- معدات
  'building',         -- مباني
  'other'             -- أخرى
);

-- 2. جدول الموردين وشركات الصيانة
CREATE TABLE public.maintenance_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  specialization TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. جدول الأصول (المواقع والمعدات)
CREATE TABLE public.maintenance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  type maintenance_asset_type NOT NULL,
  location TEXT NOT NULL,
  site TEXT,
  description TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. جدول بنود الصيانة
CREATE TABLE public.maintenance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.maintenance_assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  frequency maintenance_frequency NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  vendor_id UUID REFERENCES public.maintenance_vendors(id) ON DELETE SET NULL,
  estimated_cost DECIMAL(10,2),
  reminder_days INTEGER DEFAULT 7,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. جدول الجدول الزمني (Schedule)
CREATE TABLE public.maintenance_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_item_id UUID NOT NULL REFERENCES public.maintenance_items(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  status maintenance_status DEFAULT 'pending',
  scheduled_date DATE NOT NULL,
  executed_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  actual_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(maintenance_item_id, year, month)
);

-- 6. جدول المرفقات
CREATE TABLE public.maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.maintenance_schedule(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. إنشاء Indexes للأداء
CREATE INDEX idx_maintenance_items_asset ON public.maintenance_items(asset_id);
CREATE INDEX idx_maintenance_items_vendor ON public.maintenance_items(vendor_id);
CREATE INDEX idx_maintenance_items_active ON public.maintenance_items(active) WHERE active = true;
CREATE INDEX idx_maintenance_schedule_item ON public.maintenance_schedule(maintenance_item_id);
CREATE INDEX idx_maintenance_schedule_date ON public.maintenance_schedule(scheduled_date);
CREATE INDEX idx_maintenance_schedule_status ON public.maintenance_schedule(status);
CREATE INDEX idx_maintenance_schedule_year_month ON public.maintenance_schedule(year, month);
CREATE INDEX idx_maintenance_attachments_schedule ON public.maintenance_attachments(schedule_id);

-- 8. إنشاء Triggers لتحديث updated_at
CREATE TRIGGER update_maintenance_vendors_updated_at
  BEFORE UPDATE ON public.maintenance_vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_maintenance_assets_updated_at
  BEFORE UPDATE ON public.maintenance_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_maintenance_items_updated_at
  BEFORE UPDATE ON public.maintenance_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_maintenance_schedule_updated_at
  BEFORE UPDATE ON public.maintenance_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 9. Function لتوليد الجدول السنوي تلقائياً
CREATE OR REPLACE FUNCTION public.generate_maintenance_schedule(_item_id UUID, _year INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_month INTEGER;
  v_required BOOLEAN;
  v_start_month INTEGER;
BEGIN
  -- جلب بيانات البند
  SELECT * INTO v_item FROM maintenance_items WHERE id = _item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance item not found';
  END IF;
  
  -- تحديد شهر البداية
  v_start_month := EXTRACT(MONTH FROM v_item.start_date);
  
  -- توليد سجلات للـ 12 شهر
  FOR v_month IN 1..12 LOOP
    -- تحديد ما إذا كان الشهر مطلوباً حسب التكرار
    v_required := CASE v_item.frequency
      WHEN 'monthly' THEN true
      WHEN 'quarterly' THEN ((v_month - v_start_month) % 3 = 0)
      WHEN 'semiannual' THEN ((v_month - v_start_month) % 6 = 0)
      WHEN 'annual' THEN (v_month = v_start_month)
      WHEN 'ad_hoc' THEN false
      ELSE false
    END;
    
    -- إدراج السجل
    INSERT INTO maintenance_schedule (
      maintenance_item_id,
      year,
      month,
      status,
      scheduled_date
    ) VALUES (
      _item_id,
      _year,
      v_month,
      CASE WHEN v_required THEN 'pending'::maintenance_status ELSE 'not_required'::maintenance_status END,
      make_date(_year, v_month, 1)
    )
    ON CONFLICT (maintenance_item_id, year, month) DO NOTHING;
  END LOOP;
END;
$$;

-- 10. Function لتحديث تاريخ الصيانة التالية
CREATE OR REPLACE FUNCTION public.update_next_maintenance_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_next_date DATE;
BEGIN
  -- إذا تم تحديث الحالة إلى "تم"
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    -- جلب بيانات البند
    SELECT * INTO v_item FROM maintenance_items WHERE id = NEW.maintenance_item_id;
    
    -- حساب التاريخ التالي
    v_next_date := CASE v_item.frequency
      WHEN 'monthly' THEN NEW.executed_date + INTERVAL '1 month'
      WHEN 'quarterly' THEN NEW.executed_date + INTERVAL '3 months'
      WHEN 'semiannual' THEN NEW.executed_date + INTERVAL '6 months'
      WHEN 'annual' THEN NEW.executed_date + INTERVAL '1 year'
      ELSE NULL
    END;
    
    -- تحديث بند الصيانة
    UPDATE maintenance_items
    SET 
      last_maintenance_date = NEW.executed_date,
      next_maintenance_date = v_next_date
    WHERE id = NEW.maintenance_item_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_maintenance_dates
  AFTER UPDATE OF status ON public.maintenance_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_next_maintenance_date();

-- 11. Function لإنشاء إشعار صيانة
CREATE OR REPLACE FUNCTION public.create_maintenance_notification(
  _schedule_id UUID,
  _notification_type TEXT,
  _message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_item RECORD;
BEGIN
  -- جلب بيانات الجدول والبند
  SELECT s.*, i.name as item_name, i.created_by
  INTO v_schedule
  FROM maintenance_schedule s
  JOIN maintenance_items i ON i.id = s.maintenance_item_id
  WHERE s.id = _schedule_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- إنشاء إشعار للمسؤول عن البند
  IF v_schedule.created_by IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      v_schedule.created_by,
      'تنبيه صيانة: ' || v_schedule.item_name,
      _message,
      CASE _notification_type
        WHEN 'reminder' THEN 'info'
        WHEN 'due' THEN 'warning'
        WHEN 'overdue' THEN 'error'
        ELSE 'info'
      END
    );
  END IF;
  
  -- إشعار للشخص المعين (إذا وجد)
  IF v_schedule.assigned_to IS NOT NULL AND v_schedule.assigned_to != v_schedule.created_by THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      v_schedule.assigned_to,
      'مهمة صيانة: ' || v_schedule.item_name,
      _message,
      CASE _notification_type
        WHEN 'reminder' THEN 'info'
        WHEN 'due' THEN 'warning'
        WHEN 'overdue' THEN 'error'
        ELSE 'info'
      END
    );
  END IF;
END;
$$;

-- 12. إنشاء RLS Policies

-- Vendors
ALTER TABLE public.maintenance_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view all vendors"
  ON public.maintenance_vendors FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can manage vendors"
  ON public.maintenance_vendors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Assets
ALTER TABLE public.maintenance_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view all assets"
  ON public.maintenance_assets FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can manage assets"
  ON public.maintenance_assets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Maintenance Items
ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view all maintenance items"
  ON public.maintenance_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can manage maintenance items"
  ON public.maintenance_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Maintenance Schedule
ALTER TABLE public.maintenance_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view all schedules"
  ON public.maintenance_schedule FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can manage schedules"
  ON public.maintenance_schedule FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Attachments
ALTER TABLE public.maintenance_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view all attachments"
  ON public.maintenance_attachments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can manage attachments"
  ON public.maintenance_attachments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 13. إضافة تعليقات للتوثيق
COMMENT ON TABLE public.maintenance_vendors IS 'جدول الموردين وشركات الصيانة الخارجية';
COMMENT ON TABLE public.maintenance_assets IS 'جدول الأصول والمعدات التي تحتاج صيانة';
COMMENT ON TABLE public.maintenance_items IS 'جدول بنود الصيانة الدورية';
COMMENT ON TABLE public.maintenance_schedule IS 'جدول المواعيد والحالات الشهرية للصيانة';
COMMENT ON TABLE public.maintenance_attachments IS 'جدول مرفقات الصيانة (صور، تقارير، فواتير)';
COMMENT ON FUNCTION public.generate_maintenance_schedule IS 'توليد جدول صيانة سنوي لبند معين';
COMMENT ON FUNCTION public.update_next_maintenance_date IS 'تحديث تاريخ الصيانة القادمة تلقائياً عند تنفيذ المهمة';
COMMENT ON FUNCTION public.create_maintenance_notification IS 'إنشاء إشعار صيانة للمستخدمين المعنيين';