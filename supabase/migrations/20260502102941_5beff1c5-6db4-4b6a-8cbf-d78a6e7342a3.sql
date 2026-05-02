
CREATE OR REPLACE FUNCTION public.compute_daily_record_kpis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;
