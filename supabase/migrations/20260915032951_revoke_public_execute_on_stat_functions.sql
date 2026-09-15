-- The previous REVOKE ... FROM anon was a no-op: Postgres grants EXECUTE on
-- new functions to PUBLIC by default, and anon inherits it there, so the role
-- still held the privilege. Revoke from PUBLIC, then grant back only to the
-- roles that should have it.
--
-- The in-function auth.uid() guard is the real protection; this is the second
-- layer, so an unauthenticated caller is refused at the door rather than
-- inside the function body.

REVOKE EXECUTE ON FUNCTION public.increment_user_stat(uuid, text, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.increment_user_stat(uuid, text, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated, service_role;
