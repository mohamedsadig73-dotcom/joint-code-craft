-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  declaration_id TEXT NOT NULL REFERENCES public.declarations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Function to create notification on status change
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

-- Create trigger for notifications
CREATE TRIGGER trigger_notify_declaration_status_change
AFTER UPDATE ON public.declarations
FOR EACH ROW
EXECUTE FUNCTION public.notify_declaration_status_change();