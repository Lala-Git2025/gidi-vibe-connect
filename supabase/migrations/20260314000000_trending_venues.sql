-- =====================================================
-- Trending Venues: Promotion columns + scoring view
-- =====================================================

-- 1. Add promotion columns to venues
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS is_promoted    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promotion_label TEXT        DEFAULT 'Sponsored';

-- Index for fast promoted-venue queries
CREATE INDEX IF NOT EXISTS idx_venues_promoted ON public.venues(is_promoted, promoted_until)
  WHERE is_promoted = true;

-- 2. Trending venues view
--    • Promoted venues (is_promoted = true AND promoted_until > now()) always rank first (score = 999999)
--    • Remaining slots ordered by time-decayed composite score:
--        checkins last 24h × 10  +  checkins last 7d × 3
--      + avg live rating × 20   +  RSVPs last 7d × 5
--      ÷ (hours since last activity + 2)^1.5
CREATE OR REPLACE VIEW public.trending_venues AS
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
ORDER BY trending_score DESC;
