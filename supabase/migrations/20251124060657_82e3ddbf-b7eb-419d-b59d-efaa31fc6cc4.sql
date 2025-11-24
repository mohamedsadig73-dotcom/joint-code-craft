-- إصلاح التحذيرات الأمنية المتبقية
-- Fix remaining security warnings

-- 1. تحديث جميع الدوال لتحديد search_path بشكل آمن
-- Update all functions to set search_path securely

-- تحديث دالة update_updated_at
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- إعادة إنشاء الـ triggers
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_declarations_updated_at
BEFORE UPDATE ON public.declarations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- 2. تحديث دالة handle_new_user
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- إعادة إنشاء الـ trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 3. تحديث دالة log_declaration_status_change
DROP FUNCTION IF EXISTS public.log_declaration_status_change() CASCADE;

CREATE OR REPLACE FUNCTION public.log_declaration_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.declaration_status_history (
      declaration_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  -- Log initial status on insert
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.declaration_status_history (
      declaration_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      NULL,
      NEW.status,
      NEW.sender_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- إعادة إنشاء الـ trigger
CREATE TRIGGER log_declaration_status_change
AFTER INSERT OR UPDATE ON public.declarations
FOR EACH ROW
EXECUTE FUNCTION public.log_declaration_status_change();

-- 4. تحديث دالة notify_declaration_status_change
DROP FUNCTION IF EXISTS public.notify_declaration_status_change() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_declaration_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status_label TEXT;
  v_new_status_label TEXT;
  v_notification_message TEXT;
BEGIN
  -- Only proceed if status changed and there's a user to notify
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    
    -- Map status to Arabic labels
    v_old_status_label := CASE OLD.status
      WHEN 'draft' THEN 'مسودة'
      WHEN 'pending_warehouse_signature' THEN 'بانتظار توقيع المخزن'
      WHEN 'warehouse_signed' THEN 'موقّع من المخزن'
      WHEN 'sent_to_admin_office' THEN 'مُرسل إلى المكتب الإداري'
      WHEN 'received_by_admin_office' THEN 'مستلم من المكتب الإداري'
      WHEN 'returned_to_warehouse' THEN 'مُعاد إلى المخزن للأرشفة'
      WHEN 'archived' THEN 'مؤرشف'
      WHEN 'rejected' THEN 'مرفوض'
      ELSE 'غير معروف'
    END;
    
    v_new_status_label := CASE NEW.status
      WHEN 'draft' THEN 'مسودة'
      WHEN 'pending_warehouse_signature' THEN 'بانتظار توقيع المخزن'
      WHEN 'warehouse_signed' THEN 'موقّع من المخزن'
      WHEN 'sent_to_admin_office' THEN 'مُرسل إلى المكتب الإداري'
      WHEN 'received_by_admin_office' THEN 'مستلم من المكتب الإداري'
      WHEN 'returned_to_warehouse' THEN 'مُعاد إلى المخزن للأرشفة'
      WHEN 'archived' THEN 'مؤرشف'
      WHEN 'rejected' THEN 'مرفوض'
      ELSE 'غير معروف'
    END;
    
    v_notification_message := 'تم تغيير حالة الإقرار ' || NEW.id || ' من "' || v_old_status_label || '" إلى "' || v_new_status_label || '"';
    
    -- Create notification for the declaration sender
    INSERT INTO public.notifications (
      user_id,
      declaration_id,
      title,
      message,
      type
    ) VALUES (
      NEW.sender_id,
      NEW.id,
      'تحديث حالة الإقرار',
      v_notification_message,
      CASE 
        WHEN NEW.status = 'rejected' THEN 'error'
        WHEN NEW.status = 'archived' THEN 'success'
        ELSE 'info'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- إعادة إنشاء الـ trigger
CREATE TRIGGER notify_declaration_status_change
AFTER UPDATE ON public.declarations
FOR EACH ROW
EXECUTE FUNCTION public.notify_declaration_status_change();