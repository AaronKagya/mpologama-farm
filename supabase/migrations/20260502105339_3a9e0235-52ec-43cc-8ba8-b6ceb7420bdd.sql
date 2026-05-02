-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Attach KPI trigger that was missing
DROP TRIGGER IF EXISTS compute_daily_record_kpis_trg ON public.daily_records;
CREATE TRIGGER compute_daily_record_kpis_trg
  BEFORE INSERT OR UPDATE ON public.daily_records
  FOR EACH ROW EXECUTE FUNCTION public.compute_daily_record_kpis();

-- Lock daily_records to authenticated users only
DROP POLICY IF EXISTS "Public delete" ON public.daily_records;
DROP POLICY IF EXISTS "Public insert" ON public.daily_records;
DROP POLICY IF EXISTS "Public read" ON public.daily_records;
DROP POLICY IF EXISTS "Public update" ON public.daily_records;

CREATE POLICY "Auth read records"   ON public.daily_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert records" ON public.daily_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update records" ON public.daily_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete records" ON public.daily_records FOR DELETE TO authenticated USING (true);