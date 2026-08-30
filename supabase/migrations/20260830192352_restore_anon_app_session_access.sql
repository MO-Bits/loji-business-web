-- The application gate calls this function before a Supabase session exists so
-- it can route public visitors to the sign-in screen. The function returns
-- immediately when auth.uid() is null and does not expose property data.
revoke execute on function public.get_app_session() from public;
grant execute on function public.get_app_session() to anon, authenticated;
