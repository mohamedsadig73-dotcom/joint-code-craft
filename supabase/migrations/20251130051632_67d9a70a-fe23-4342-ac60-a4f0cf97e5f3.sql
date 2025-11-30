-- إنشاء bucket للمرفقات
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-attachments', 'maintenance-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- سياسات للمرفقات
CREATE POLICY "Admins and managers can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'maintenance-attachments' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'maintenance-attachments' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can delete attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'maintenance-attachments' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- تحديث دالة الإشعارات لتشمل الصيانة
CREATE OR REPLACE FUNCTION check_maintenance_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_item RECORD;
BEGIN
  -- التحقق من المهام القادمة (قبل 7 أيام)
  FOR v_schedule IN
    SELECT s.*, i.name as item_name, i.created_by, i.reminder_days
    FROM maintenance_schedule s
    JOIN maintenance_items i ON i.id = s.maintenance_item_id
    WHERE s.status = 'pending'
      AND s.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND s.scheduled_date - CURRENT_DATE <= COALESCE(i.reminder_days, 7)
  LOOP
    -- إنشاء إشعار تذكير
    PERFORM create_maintenance_notification(
      v_schedule.id,
      'reminder',
      format('تذكير: صيانة "%s" مجدولة في %s', v_schedule.item_name, v_schedule.scheduled_date)
    );
  END LOOP;

  -- التحقق من المهام المتأخرة
  FOR v_schedule IN
    SELECT s.*, i.name as item_name, i.created_by
    FROM maintenance_schedule s
    JOIN maintenance_items i ON i.id = s.maintenance_item_id
    WHERE s.status = 'pending'
      AND s.scheduled_date < CURRENT_DATE
  LOOP
    -- تحديث الحالة إلى متأخر
    UPDATE maintenance_schedule
    SET status = 'overdue'
    WHERE id = v_schedule.id;

    -- إنشاء إشعار متأخر
    PERFORM create_maintenance_notification(
      v_schedule.id,
      'overdue',
      format('تنبيه: صيانة "%s" متأخرة منذ %s', v_schedule.item_name, v_schedule.scheduled_date)
    );
  END LOOP;
END;
$$;