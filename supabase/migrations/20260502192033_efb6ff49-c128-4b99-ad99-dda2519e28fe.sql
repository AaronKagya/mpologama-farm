
DROP POLICY IF EXISTS "Auth insert activity" ON public.activity_log;
CREATE POLICY "Auth insert own activity"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

REVOKE EXECUTE ON FUNCTION public.log_daily_record_activity() FROM PUBLIC, anon, authenticated;
