-- =====================================================
-- Scalability Fixes for Millions of Users
-- =====================================================

-- ══════════════════════════════════════════════════════
-- 1. MATERIALIZED VIEW: trending_venues
--    Replaces the regular view with a materialized view
--    that is refreshed on a schedule, not per-request.
-- ══════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.trending_venues;

CREATE MATERIALIZED VIEW public.trending_venues AS
WITH venue_signals AS (
  SELECT
    v.id,
    v.name,
    v.location,
    v.rating,
    v.professional_media_urls,
    v.category,
    v.is_promoted,
    v.promoted_until,
    v.promotion_label,
    v.created_at,

    COUNT(DISTINCT ci.id)
      FILTER (WHERE ci.checked_in_at > now() - interval '24 hours') AS checkins_24h,
    COUNT(DISTINCT ci.id)
      FILTER (WHERE ci.checked_in_at > now() - interval '7 days')   AS checkins_7d,
    COALESCE(AVG(vr.rating), v.rating, 3.0)                         AS live_rating,
    MAX(ci.checked_in_at)                                            AS last_checkin_at

  FROM public.venues v
  LEFT JOIN public.venue_check_ins ci ON ci.venue_id = v.id
  LEFT JOIN public.venue_reviews   vr ON vr.venue_id = v.id
  GROUP BY v.id
)
SELECT
  *,
  CASE
    WHEN is_promoted AND (promoted_until IS NULL OR promoted_until > now())
    THEN 999999.0
    ELSE (
      checkins_24h * 10.0
      + checkins_7d  * 3.0
      + live_rating  * 20.0
    ) / POWER(
      EXTRACT(EPOCH FROM (now() - COALESCE(last_checkin_at, created_at))) / 3600.0 + 2,
      1.5
    )
  END AS trending_score
FROM venue_signals
ORDER BY
  CASE
    WHEN is_promoted AND (promoted_until IS NULL OR promoted_until > now())
    THEN 999999.0
    ELSE (
      checkins_24h * 10.0
      + checkins_7d  * 3.0
      + live_rating  * 20.0
    ) / POWER(
      EXTRACT(EPOCH FROM (now() - COALESCE(last_checkin_at, created_at))) / 3600.0 + 2,
      1.5
    )
  END DESC;

-- Index on the materialized view for fast lookups
CREATE UNIQUE INDEX idx_trending_venues_id ON public.trending_venues(id);
CREATE INDEX idx_trending_venues_score ON public.trending_venues(trending_score DESC);
CREATE INDEX idx_trending_venues_location ON public.trending_venues(location);

-- Function to refresh the materialized view (called by cron or Edge Function)
CREATE OR REPLACE FUNCTION public.refresh_trending_venues()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.trending_venues;
END;
$$;

-- ══════════════════════════════════════════════════════
-- 2. AUTH ROLE HELPER FUNCTION
--    Avoids repeated subqueries in RLS policies.
--    STABLE = result cached within a single transaction.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.auth_role() IN ('Admin', 'Super Admin');
$$;

-- Helper: check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.auth_role() = 'Super Admin';
$$;

-- ══════════════════════════════════════════════════════
-- 3. UPDATE RLS POLICIES TO USE auth_role() / is_admin()
--    Replace subquery-based role checks with function calls.
-- ══════════════════════════════════════════════════════

-- ── venues: admin SELECT policy ──
DROP POLICY IF EXISTS "Owners and admins can view venues" ON public.venues;
CREATE POLICY "Owners and admins can view venues"
  ON public.venues FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- ── venues: admin UPDATE policy ──
DROP POLICY IF EXISTS "Owners and admins can update venues" ON public.venues;
CREATE POLICY "Owners and admins can update venues"
  ON public.venues FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- ── business_profiles: admin SELECT ──
DROP POLICY IF EXISTS "Admins can view all business profiles" ON public.business_profiles;
CREATE POLICY "Admins can view all business profiles"
  ON public.business_profiles FOR SELECT
  USING (public.is_admin());

-- ── business_profiles: admin UPDATE ──
DROP POLICY IF EXISTS "Admins can update all business profiles" ON public.business_profiles;
CREATE POLICY "Admins can update all business profiles"
  ON public.business_profiles FOR UPDATE
  USING (public.is_admin());

-- ── business_profiles: business owner INSERT ──
DROP POLICY IF EXISTS "Business owners can insert own business profile" ON public.business_profiles;
CREATE POLICY "Business owners can insert own business profile"
  ON public.business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.auth_role() = 'Business Owner');

-- ── admin_profiles: super admin policies ──
DROP POLICY IF EXISTS "Super Admins can view all admin profiles" ON public.admin_profiles;
CREATE POLICY "Super Admins can view all admin profiles"
  ON public.admin_profiles FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super Admins can insert admin profiles" ON public.admin_profiles;
CREATE POLICY "Super Admins can insert admin profiles"
  ON public.admin_profiles FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super Admins can update all admin profiles" ON public.admin_profiles;
CREATE POLICY "Super Admins can update all admin profiles"
  ON public.admin_profiles FOR UPDATE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super Admins can delete admin profiles" ON public.admin_profiles;
CREATE POLICY "Super Admins can delete admin profiles"
  ON public.admin_profiles FOR DELETE
  USING (public.is_super_admin());

-- ── verification_requests: business owner INSERT ──
DROP POLICY IF EXISTS "Business owners can create verification requests" ON public.verification_requests;
CREATE POLICY "Business owners can create verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.auth_role() = 'Business Owner');

-- ══════════════════════════════════════════════════════
-- 4. FOLLOWS TABLE: composite index + count cache
-- ══════════════════════════════════════════════════════

-- Composite index for efficient follow lookups and uniqueness checks
CREATE INDEX IF NOT EXISTS idx_follows_follower_following
  ON public.follows(follower_id, following_id);

-- Count cache columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

-- Backfill follower counts
UPDATE public.profiles p
SET follower_count = (
  SELECT COUNT(*) FROM public.follows f WHERE f.following_id = p.user_id
);

UPDATE public.profiles p
SET following_count = (
  SELECT COUNT(*) FROM public.follows f WHERE f.follower_id = p.user_id
);

-- Trigger to keep follow counts in sync
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = OLD.follower_id;
    UPDATE public.profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE user_id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_follow_counts ON public.follows;
CREATE TRIGGER trg_update_follow_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_follow_counts();

-- ══════════════════════════════════════════════════════
-- 5. BRIN INDEX for time-based check-in queries
--    BRIN is ideal for append-only time-series data —
--    tiny index size, fast range scans.
-- ══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_venue_check_ins_time_brin
  ON public.venue_check_ins
  USING BRIN (checked_in_at)
  WITH (pages_per_range = 32);

-- Also add BRIN on story_views for time-based queries
CREATE INDEX IF NOT EXISTS idx_story_views_time_brin
  ON public.story_views
  USING BRIN (viewed_at)
  WITH (pages_per_range = 32);

-- BRIN on event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_time_brin
  ON public.event_rsvps
  USING BRIN (rsvp_at)
  WITH (pages_per_range = 32);

-- ══════════════════════════════════════════════════════
-- 6. EXPIRED STORIES CLEANUP FUNCTION
--    Call via pg_cron or Supabase scheduled function.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete stories expired more than 24h ago (keep recently expired for grace period)
  DELETE FROM public.stories
  WHERE expires_at < now() - interval '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Also clean up orphaned story_views
  DELETE FROM public.story_views
  WHERE story_id NOT IN (SELECT id FROM public.stories);

  RETURN deleted_count;
END;
$$;

-- ══════════════════════════════════════════════════════
-- 7. ADDITIONAL PERFORMANCE INDEXES
-- ══════════════════════════════════════════════════════

-- Profiles: index on role for fast role-based filtering (admin portal user manager)
-- Already exists as idx_profiles_role but ensure it's there
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Profiles: index for username search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles(lower(username));

-- Profiles: index for full_name search
CREATE INDEX IF NOT EXISTS idx_profiles_fullname_lower
  ON public.profiles(lower(full_name));

-- Venues: text search index for name + location
CREATE INDEX IF NOT EXISTS idx_venues_search
  ON public.venues
  USING gin(to_tsvector('english', name || ' ' || COALESCE(location, '')));

-- News: index for publish date (consumer app feed)
CREATE INDEX IF NOT EXISTS idx_news_publish_date
  ON public.news(publish_date DESC);

-- Composite index for venue reviews per venue (trending calc)
CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue_rating
  ON public.venue_reviews(venue_id, rating);
