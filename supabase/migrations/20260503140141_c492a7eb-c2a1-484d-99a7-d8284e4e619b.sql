REVOKE EXECUTE ON FUNCTION public.user_owns_farm(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_flock(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_farm() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_daily_record_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_farm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_flock(uuid) TO authenticated;