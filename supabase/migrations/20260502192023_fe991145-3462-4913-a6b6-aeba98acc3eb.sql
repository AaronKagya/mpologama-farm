
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  user_name text,
  action text NOT NULL,
  entity text NOT NULL DEFAULT 'daily_record',
  entity_date date,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_created_at ON public.activity_log (created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read activity"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth insert activity"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger function to log changes on daily_records
CREATE OR REPLACE FUNCTION public.log_daily_record_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_action text;
  v_date date;
  v_details jsonb;
  v_changes jsonb := '{}'::jsonb;
  k text;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    SELECT display_name INTO v_name FROM public.profiles WHERE user_id = v_uid;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_date := NEW.date;
    v_details := jsonb_build_object(
      'eggs_collected', NEW.eggs_collected,
      'hens_alive', NEW.hens_alive,
      'feed_kg', NEW.feed_kg,
      'deaths', NEW.deaths,
      'broken_eggs', NEW.broken_eggs
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_date := NEW.date;
    FOR k IN SELECT unnest(ARRAY['hens_alive','eggs_collected','broken_eggs','feed_kg','water_liters','deaths']) LOOP
      IF to_jsonb(NEW)->k IS DISTINCT FROM to_jsonb(OLD)->k THEN
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('from', to_jsonb(OLD)->k, 'to', to_jsonb(NEW)->k));
      END IF;
    END LOOP;
    v_details := jsonb_build_object('changes', v_changes);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_date := OLD.date;
    v_details := jsonb_build_object(
      'eggs_collected', OLD.eggs_collected,
      'hens_alive', OLD.hens_alive
    );
  END IF;

  INSERT INTO public.activity_log (user_id, user_email, user_name, action, entity, entity_date, details)
  VALUES (v_uid, v_email, v_name, v_action, 'daily_record', v_date, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_daily_record_ins
AFTER INSERT ON public.daily_records
FOR EACH ROW EXECUTE FUNCTION public.log_daily_record_activity();

CREATE TRIGGER trg_log_daily_record_upd
AFTER UPDATE ON public.daily_records
FOR EACH ROW EXECUTE FUNCTION public.log_daily_record_activity();

CREATE TRIGGER trg_log_daily_record_del
AFTER DELETE ON public.daily_records
FOR EACH ROW EXECUTE FUNCTION public.log_daily_record_activity();
