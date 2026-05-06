-- 1) Membership table: many users <-> many farms
CREATE TYPE public.farm_role AS ENUM ('owner','manager','viewer');

CREATE TABLE public.farm_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.farm_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farm_id, user_id)
);

CREATE INDEX idx_farm_members_user ON public.farm_members(user_id);
CREATE INDEX idx_farm_members_farm ON public.farm_members(farm_id);

ALTER TABLE public.farm_members ENABLE ROW LEVEL SECURITY;

-- 2) Add farm_id to activity_log so logs are farm-scoped
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS farm_id UUID;
CREATE INDEX IF NOT EXISTS idx_activity_log_farm ON public.activity_log(farm_id);

-- 3) Backfill: every existing farm owner becomes an 'owner' member
INSERT INTO public.farm_members (farm_id, user_id, role)
SELECT id, user_id, 'owner'::public.farm_role FROM public.farms
ON CONFLICT (farm_id, user_id) DO NOTHING;

-- 4) Backfill activity_log.farm_id from daily_records -> flocks -> farms
UPDATE public.activity_log al
SET farm_id = f.farm_id
FROM public.daily_records dr
JOIN public.flocks f ON f.id = dr.flock_id
WHERE al.farm_id IS NULL
  AND al.entity = 'daily_record'
  AND al.entity_date = dr.date
  AND al.user_id IN (SELECT user_id FROM public.farms WHERE id = f.farm_id);

-- 5) Security-definer membership helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_farm_member(_farm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_members
    WHERE farm_id = _farm_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.farms WHERE id = _farm_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.has_farm_role(_farm_id uuid, _roles public.farm_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_members
    WHERE farm_id = _farm_id AND user_id = auth.uid() AND role = ANY(_roles)
  ) OR EXISTS (
    SELECT 1 FROM public.farms WHERE id = _farm_id AND user_id = auth.uid()
  )
$$;

-- 6) Replace user_owns_farm / user_owns_flock to use membership
CREATE OR REPLACE FUNCTION public.user_owns_farm(_farm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_farm_member(_farm_id)
$$;

CREATE OR REPLACE FUNCTION public.user_owns_flock(_flock_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flocks fl
    WHERE fl.id = _flock_id AND public.is_farm_member(fl.farm_id)
  )
$$;

-- 7) RLS for farm_members
CREATE POLICY "Members view own memberships and farm peers"
ON public.farm_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_farm_member(farm_id));

CREATE POLICY "Owners manage members - insert"
ON public.farm_members FOR INSERT TO authenticated
WITH CHECK (public.has_farm_role(farm_id, ARRAY['owner']::public.farm_role[]));

CREATE POLICY "Owners manage members - update"
ON public.farm_members FOR UPDATE TO authenticated
USING (public.has_farm_role(farm_id, ARRAY['owner']::public.farm_role[]));

CREATE POLICY "Owners manage members - delete"
ON public.farm_members FOR DELETE TO authenticated
USING (public.has_farm_role(farm_id, ARRAY['owner']::public.farm_role[]));

-- 8) Update farms SELECT policy to include members (other policies stay owner-only)
DROP POLICY IF EXISTS "Users view own farms" ON public.farms;
CREATE POLICY "Members view their farms"
ON public.farms FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_farm_member(id));

-- 9) Update activity_log RLS to be farm-scoped (members of the farm)
DROP POLICY IF EXISTS "Auth read activity" ON public.activity_log;
DROP POLICY IF EXISTS "Auth insert own activity" ON public.activity_log;

CREATE POLICY "Members read farm activity"
ON public.activity_log FOR SELECT TO authenticated
USING (
  farm_id IS NULL AND user_id = auth.uid()  -- legacy/own session events
  OR (farm_id IS NOT NULL AND public.is_farm_member(farm_id))
);

CREATE POLICY "Members insert farm activity"
ON public.activity_log FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (farm_id IS NULL OR public.is_farm_member(farm_id))
);

-- 10) Update activity trigger to set farm_id
CREATE OR REPLACE FUNCTION public.log_daily_record_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_action text;
  v_date date;
  v_details jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_farm_id uuid;
  v_flock_id uuid;
  k text;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    SELECT display_name INTO v_name FROM public.profiles WHERE user_id = v_uid;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created'; v_date := NEW.date; v_flock_id := NEW.flock_id;
    v_details := jsonb_build_object(
      'eggs_collected', NEW.eggs_collected,'hens_alive', NEW.hens_alive,
      'feed_kg', NEW.feed_kg,'deaths', NEW.deaths,'broken_eggs', NEW.broken_eggs);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated'; v_date := NEW.date; v_flock_id := NEW.flock_id;
    FOR k IN SELECT unnest(ARRAY['hens_alive','eggs_collected','broken_eggs','feed_kg','water_liters','deaths']) LOOP
      IF to_jsonb(NEW)->k IS DISTINCT FROM to_jsonb(OLD)->k THEN
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('from', to_jsonb(OLD)->k, 'to', to_jsonb(NEW)->k));
      END IF;
    END LOOP;
    v_details := jsonb_build_object('changes', v_changes);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted'; v_date := OLD.date; v_flock_id := OLD.flock_id;
    v_details := jsonb_build_object('eggs_collected', OLD.eggs_collected,'hens_alive', OLD.hens_alive);
  END IF;

  SELECT farm_id INTO v_farm_id FROM public.flocks WHERE id = v_flock_id;

  INSERT INTO public.activity_log (user_id, user_email, user_name, action, entity, entity_date, details, farm_id)
  VALUES (v_uid, v_email, v_name, v_action, 'daily_record', v_date, v_details, v_farm_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 11) Update new-user trigger to also create owner membership
CREATE OR REPLACE FUNCTION public.handle_new_user_farm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_farm UUID;
BEGIN
  INSERT INTO public.farms (user_id, farm_name) VALUES (NEW.id, 'My Farm') RETURNING id INTO v_farm;
  INSERT INTO public.farm_members (farm_id, user_id, role) VALUES (v_farm, NEW.id, 'owner');
  INSERT INTO public.farm_settings (farm_id) VALUES (v_farm);
  INSERT INTO public.flocks (farm_id, flock_name, start_date, initial_birds)
    VALUES (v_farm, 'Flock 1', CURRENT_DATE, 0);
  RETURN NEW;
END;
$function$;