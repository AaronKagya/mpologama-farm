
CREATE TABLE public.daily_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  hens_alive INTEGER NOT NULL,
  eggs_collected INTEGER NOT NULL,
  broken_eggs INTEGER NOT NULL DEFAULT 0,
  feed_kg NUMERIC(10,2) NOT NULL,
  water_liters NUMERIC(10,2),
  deaths INTEGER NOT NULL DEFAULT 0,
  production_rate NUMERIC(6,2),
  mortality_rate NUMERIC(6,2),
  feed_efficiency NUMERIC(8,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validate non-negative + compute KPIs server-side
CREATE OR REPLACE FUNCTION public.compute_daily_record_kpis()
RETURNS TRIGGER AS $$
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_daily_record_kpis
BEFORE INSERT OR UPDATE ON public.daily_records
FOR EACH ROW EXECUTE FUNCTION public.compute_daily_record_kpis();

ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON public.daily_records FOR SELECT USING (true);
CREATE POLICY "Public insert" ON public.daily_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON public.daily_records FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON public.daily_records FOR DELETE USING (true);

CREATE INDEX idx_daily_records_date ON public.daily_records(date DESC);
