-- 1. FARMS
CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_farms_user ON public.farms(user_id);
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own farms" ON public.farms FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own farms" ON public.farms FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own farms" ON public.farms FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own farms" ON public.farms FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2. FLOCKS
CREATE TABLE public.flocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  flock_name TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  initial_birds INTEGER NOT NULL DEFAULT 0,
  breed TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_flocks_farm ON public.flocks(farm_id);
ALTER TABLE public.flocks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_owns_farm(_farm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.farms WHERE id = _farm_id AND user_id = auth.uid())
$$;

CREATE POLICY "Users view own flocks" ON public.flocks FOR SELECT TO authenticated USING (public.user_owns_farm(farm_id));
CREATE POLICY "Users insert own flocks" ON public.flocks FOR INSERT TO authenticated WITH CHECK (public.user_owns_farm(farm_id));
CREATE POLICY "Users update own flocks" ON public.flocks FOR UPDATE TO authenticated USING (public.user_owns_farm(farm_id));
CREATE POLICY "Users delete own flocks" ON public.flocks FOR DELETE TO authenticated USING (public.user_owns_farm(farm_id));

-- 3. FARM SETTINGS
CREATE TABLE public.farm_settings (
  farm_id UUID PRIMARY KEY REFERENCES public.farms(id) ON DELETE CASCADE,
  price_per_tray NUMERIC NOT NULL DEFAULT 13000,
  feed_cost_per_kg NUMERIC NOT NULL DEFAULT 2200,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.farm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own settings" ON public.farm_settings FOR SELECT TO authenticated USING (public.user_owns_farm(farm_id));
CREATE POLICY "Users insert own settings" ON public.farm_settings FOR INSERT TO authenticated WITH CHECK (public.user_owns_farm(farm_id));
CREATE POLICY "Users update own settings" ON public.farm_settings FOR UPDATE TO authenticated USING (public.user_owns_farm(farm_id));

-- 4. EXTEND daily_records
ALTER TABLE public.daily_records
  ADD COLUMN flock_id UUID REFERENCES public.flocks(id) ON DELETE CASCADE,
  ADD COLUMN revenue NUMERIC,
  ADD COLUMN cost NUMERIC,
  ADD COLUMN profit NUMERIC;

-- Drop old date-only unique constraint if present, replace with (flock_id, date)
ALTER TABLE public.daily_records DROP CONSTRAINT IF EXISTS daily_records_date_key;

-- 5. BACKFILL existing daily_records into a default farm/flock for earliest user
DO $$
DECLARE
  v_user UUID;
  v_farm UUID;
  v_flock UUID;
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.daily_records;
  IF v_count > 0 THEN
    SELECT id INTO v_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF v_user IS NOT NULL THEN
      INSERT INTO public.farms (user_id, farm_name, location)
      VALUES (v_user, 'My Farm', NULL) RETURNING id INTO v_farm;

      INSERT INTO public.farm_settings (farm_id) VALUES (v_farm);

      INSERT INTO public.flocks (farm_id, flock_name, start_date, initial_birds)
      SELECT v_farm, 'Flock 1',
             COALESCE((SELECT MIN(date) FROM public.daily_records), CURRENT_DATE),
             COALESCE((SELECT hens_alive FROM public.daily_records ORDER BY date ASC LIMIT 1), 0)
      RETURNING id INTO v_flock;

      UPDATE public.daily_records SET flock_id = v_flock WHERE flock_id IS NULL;
    ELSE
      -- No users yet; clear orphan records to allow NOT NULL
      DELETE FROM public.daily_records;
    END IF;
  END IF;
END $$;

ALTER TABLE public.daily_records ALTER COLUMN flock_id SET NOT NULL;
CREATE UNIQUE INDEX idx_daily_records_flock_date ON public.daily_records(flock_id, date);
CREATE INDEX idx_daily_records_flock ON public.daily_records(flock_id);

-- 6. UPDATE compute trigger to also compute revenue/cost/profit
CREATE OR REPLACE FUNCTION public.compute_daily_record_kpis()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_farm_id UUID;
  v_price NUMERIC;
  v_feed_cost NUMERIC;
BEGIN
  IF NEW.hens_alive < 0 OR NEW.eggs_collected < 0 OR NEW.broken_eggs < 0
     OR NEW.feed_kg < 0 OR NEW.deaths < 0
     OR (NEW.water_liters IS NOT NULL AND NEW.water_liters < 0) THEN
    RAISE EXCEPTION 'Values cannot be negative';
  END IF;

  IF NEW.hens_alive > 0 THEN
    NEW.production_rate := ROUND((NEW.eggs_collected::numeric / NEW.hens_alive) * 100, 2);
    NEW.mortality_rate := ROUND((NEW.deaths::numeric / NEW.hens_alive) * 100, 2);
  ELSE
    NEW.production_rate := 0;
    NEW.mortality_rate := 0;
  END IF;

  IF NEW.eggs_collected > 0 THEN
    NEW.feed_efficiency := ROUND(NEW.feed_kg / NEW.eggs_collected, 4);
  ELSE
    NEW.feed_efficiency := NULL;
  END IF;

  -- Profit calc using farm_settings
  SELECT f.farm_id INTO v_farm_id FROM public.flocks f WHERE f.id = NEW.flock_id;
  SELECT price_per_tray, feed_cost_per_kg INTO v_price, v_feed_cost
    FROM public.farm_settings WHERE farm_id = v_farm_id;
  v_price := COALESCE(v_price, 0);
  v_feed_cost := COALESCE(v_feed_cost, 0);

  NEW.revenue := ROUND((NEW.eggs_collected::numeric / 30) * v_price, 2);
  NEW.cost := ROUND(NEW.feed_kg * v_feed_cost, 2);
  NEW.profit := NEW.revenue - NEW.cost;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_daily_record_kpis ON public.daily_records;
CREATE TRIGGER trg_compute_daily_record_kpis
BEFORE INSERT OR UPDATE ON public.daily_records
FOR EACH ROW EXECUTE FUNCTION public.compute_daily_record_kpis();

-- Recompute backfilled rows so revenue/cost/profit populate
UPDATE public.daily_records SET eggs_collected = eggs_collected;

-- 7. Replace daily_records RLS policies with farm-owner scoping
DROP POLICY IF EXISTS "Auth read records" ON public.daily_records;
DROP POLICY IF EXISTS "Auth insert records" ON public.daily_records;
DROP POLICY IF EXISTS "Auth update records" ON public.daily_records;
DROP POLICY IF EXISTS "Auth delete records" ON public.daily_records;

CREATE OR REPLACE FUNCTION public.user_owns_flock(_flock_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flocks fl
    JOIN public.farms fa ON fa.id = fl.farm_id
    WHERE fl.id = _flock_id AND fa.user_id = auth.uid()
  )
$$;

CREATE POLICY "Users view own records" ON public.daily_records FOR SELECT TO authenticated USING (public.user_owns_flock(flock_id));
CREATE POLICY "Users insert own records" ON public.daily_records FOR INSERT TO authenticated WITH CHECK (public.user_owns_flock(flock_id));
CREATE POLICY "Users update own records" ON public.daily_records FOR UPDATE TO authenticated USING (public.user_owns_flock(flock_id));
CREATE POLICY "Users delete own records" ON public.daily_records FOR DELETE TO authenticated USING (public.user_owns_flock(flock_id));

-- 8. Auto-create default farm + flock + settings for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user_farm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_farm UUID;
BEGIN
  INSERT INTO public.farms (user_id, farm_name) VALUES (NEW.id, 'My Farm') RETURNING id INTO v_farm;
  INSERT INTO public.farm_settings (farm_id) VALUES (v_farm);
  INSERT INTO public.flocks (farm_id, flock_name, start_date, initial_birds)
    VALUES (v_farm, 'Flock 1', CURRENT_DATE, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_farm ON auth.users;
CREATE TRIGGER on_auth_user_created_farm
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_farm();