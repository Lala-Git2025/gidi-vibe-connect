-- =====================================================
-- Admin Analytics RLS: Allow admins to read platform data
-- for analytics dashboards and reporting.
-- =====================================================

-- ── venue_check_ins: admins can read all ─────────────
DROP POLICY IF EXISTS "Admins can view all check-ins" ON public.venue_check_ins;
CREATE POLICY "Admins can view all check-ins"
  ON public.venue_check_ins FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── event_rsvps: admins can read all ─────────────────
DROP POLICY IF EXISTS "Admins can view all rsvps" ON public.event_rsvps;
CREATE POLICY "Admins can view all rsvps"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── venue_reviews: already USING (true), no change needed

-- ── business_subscriptions: admins can read all ──────
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.business_subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON public.business_subscriptions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── events: ensure admins can read all ───────────────
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── profiles: already has USING (true) for authenticated

-- ── Grant SELECT on trending_venues materialized view ──
GRANT SELECT ON public.trending_venues TO authenticated;
GRANT SELECT ON public.trending_venues TO anon;
