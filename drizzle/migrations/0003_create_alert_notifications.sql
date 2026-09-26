CREATE OR REPLACE FUNCTION public.notify_alert_recipients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, notification_type, title, message, related_disaster_id, related_alert_id)
  SELECT DISTINCT p.id, 'alert', NEW.title, NEW.message, NEW.disaster_id, NEW.id
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.status = 'active'
    AND (NEW.recipients = 'all' OR ur.role::text = NEW.recipients OR p.id = NEW.created_by);
  RETURN NEW;
END;
$$;
CREATE TRIGGER create_notifications_after_alert
AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_alert_recipients();