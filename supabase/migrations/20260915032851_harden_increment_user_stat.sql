-- increment_user_stat ran as SECURITY DEFINER with no check on who was calling
-- it, accepted an arbitrary target user, an arbitrary XP amount and an
-- arbitrary column name, and was reachable by the anon role over the public
-- REST API. Any caller could inflate their own or another account's XP and
-- level without limit.
--
-- This rewrite keeps the same signature and behaviour for legitimate callers
-- (the consumer app, calling for the signed-in user) and closes each hole:
--   * the caller must be the user being modified, unless running as
--     service_role for server-side use
--   * the stat name must be one of the seven real counters, so the dynamic
--     UPDATE can't be steered at xp or level directly
--   * the XP award is clamped, so a single call can't jump a user to the top
--   * anon loses EXECUTE entirely

CREATE OR REPLACE FUNCTION public.increment_user_stat(
  p_user_id uuid,
  p_stat_name text,
  p_xp_amount integer DEFAULT 10
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  new_xp integer;
  new_level integer;
  allowed_stats CONSTANT text[] := ARRAY[
    'venues_visited', 'events_attended', 'reviews_written',
    'photos_uploaded', 'posts_created', 'likes_given', 'comments_made'
  ];
  safe_xp integer;
BEGIN
  -- Only the account itself may move its own counters. service_role is
  -- exempt so edge functions and scheduled jobs can still act on a user.
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user <> 'service_role'
  THEN
    RAISE EXCEPTION 'increment_user_stat: callers may only update their own stats';
  END IF;

  -- xp and level are derived, never incremented directly through here.
  IF p_stat_name IS NULL OR NOT (p_stat_name = ANY(allowed_stats)) THEN
    RAISE EXCEPTION 'increment_user_stat: unknown stat %', p_stat_name;
  END IF;

  -- A single action is worth a bounded amount, whatever the client claims.
  safe_xp := LEAST(GREATEST(COALESCE(p_xp_amount, 10), 0), 50);

  EXECUTE format(
    'UPDATE public.user_stats SET %I = %I + 1, xp = xp + $1, updated_at = now() WHERE user_id = $2',
    p_stat_name, p_stat_name
  ) USING safe_xp, p_user_id;

  SELECT xp INTO new_xp FROM public.user_stats WHERE user_id = p_user_id;
  new_level := public.calculate_level(new_xp);

  UPDATE public.user_stats
  SET level = new_level
  WHERE user_id = p_user_id AND level != new_level;

  PERFORM public.check_and_award_badges(p_user_id);
END;
$function$;

-- Signed-out callers have no stats to increment.
REVOKE EXECUTE ON FUNCTION public.increment_user_stat(uuid, text, integer) FROM anon;

-- check_and_award_badges only grants what the stats already justify, but it is
-- an internal step of the function above and nothing should call it directly
-- from the client. increment_user_stat still reaches it as the definer.
REVOKE EXECUTE ON FUNCTION public.check_and_award_badges(uuid) FROM anon;
