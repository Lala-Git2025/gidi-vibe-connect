-- Lock down SECURITY DEFINER functions that had no caller check.
--
-- Context: EXECUTE on a function is granted to PUBLIC by default in Postgres,
-- and `anon` inherits that grant. So every function below was reachable by an
-- unauthenticated caller over /rest/v1/rpc with nothing but the project's
-- publishable key, which ships in the app bundle. Revoking from `anon` alone is
-- a no-op — the grant has to come off PUBLIC.
--
-- Scope note: approve_verification and reject_verification also appear in the
-- advisor output but are NOT included here. Both already begin with an
-- is_admin() check, so they are correctly guarded despite being callable.

-- ── 1. Destructive maintenance: scheduler and service role only ─────────────
-- cleanup_expired_stories() deletes from stories and story_views with no
-- caller check at all. Any anonymous caller could wipe every story on the
-- platform. It is harmless today only because the table is empty; the moment
-- testers start posting it is a one-request data-loss bug.
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_stories() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_expired_stories() TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_expired_stories() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_expired_stories() TO service_role;

-- ── 2. Dead analytics writer ────────────────────────────────────────────────
-- record_venue_view is the pre-June duplicate of track_venue_event and is
-- called from nowhere in the codebase. Unguarded, it let anyone inflate any
-- venue's view and click counters arbitrarily.
REVOKE EXECUTE ON FUNCTION public.record_venue_view(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_venue_view(uuid, text) TO service_role;

-- ── 3. Live analytics writer ────────────────────────────────────────────────
-- track_venue_event is genuinely called by the consumer app, so it stays
-- reachable — but by signed-in users only. Leaving it open to anon means the
-- venue analytics shown to business owners (and quoted as engagement numbers)
-- can be fabricated with a single curl. The trade-off is that guest-mode
-- browsing is no longer counted: an undercount you can defend beats a number
-- anyone can inflate. The client is fire-and-forget and logs rather than
-- throwing, so guests see no change in behaviour.
REVOKE EXECUTE ON FUNCTION public.track_venue_event(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.track_venue_event(uuid, text) TO authenticated, service_role;

-- ── 4. Expensive refresh, now admin-gated ───────────────────────────────────
-- REFRESH MATERIALIZED VIEW CONCURRENTLY is not cheap, and an unauthenticated
-- caller could loop it. The admin portal's Overview page calls this deliberately,
-- so admins keep access.
--
-- The guard keys off auth.uid() rather than current_user: pg_cron runs this
-- every 10 minutes as `postgres` with no JWT, and a current_user allowlist
-- would have blocked the scheduled refresh. A null auth.uid() therefore means
-- "backend caller" and is allowed — anon is shut out by the REVOKE below
-- instead, since anon also presents a null uid.
CREATE OR REPLACE FUNCTION public.refresh_trending_venues()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'refresh_trending_venues: admins only';
  END IF;

  REFRESH MATERIALIZED VIEW CONCURRENTLY public.trending_venues;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refresh_trending_venues() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.refresh_trending_venues() TO authenticated, service_role;

-- ── 5. Badge awards for other people's accounts ─────────────────────────────
-- Any signed-in user could run this against any user id. It can only award a
-- badge the target has genuinely earned, so it forges nothing — but it is
-- still someone else's account being written to, and it is called internally
-- by increment_user_stat (which runs as the definer, so the inner call is
-- unaffected by the grant change).
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
 RETURNS TABLE(badge_name text, badge_icon text, xp_earned integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_stats_record record;
  badge_record record;
  stat_value integer;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'check_and_award_badges: callers may only evaluate their own badges';
  END IF;

  SELECT * INTO user_stats_record FROM public.user_stats WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR badge_record IN SELECT * FROM public.badges LOOP
    CASE badge_record.requirement_type
      WHEN 'venues_visited' THEN stat_value := user_stats_record.venues_visited;
      WHEN 'events_attended' THEN stat_value := user_stats_record.events_attended;
      WHEN 'reviews_written' THEN stat_value := user_stats_record.reviews_written;
      WHEN 'photos_uploaded' THEN stat_value := user_stats_record.photos_uploaded;
      WHEN 'posts_created' THEN stat_value := user_stats_record.posts_created;
      ELSE stat_value := 0;
    END CASE;

    IF stat_value >= badge_record.requirement_value THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (p_user_id, badge_record.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      IF FOUND THEN
        badge_name := badge_record.name;
        badge_icon := badge_record.icon;
        xp_earned  := badge_record.xp_reward;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated, service_role;

-- ── 6. Trigger functions ────────────────────────────────────────────────────
-- Postgres does not check EXECUTE when a trigger fires, so revoking here costs
-- nothing and removes nine needless entries from the exposed RPC surface. They
-- reference NEW/TG_OP and would error if called directly, but an endpoint that
-- errors is still an endpoint.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_business_role_assignment()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_business_subscription()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_user_stats()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_follow_counts()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_comment()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_follow()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_mentions()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_post_like()                 FROM PUBLIC, anon, authenticated;
