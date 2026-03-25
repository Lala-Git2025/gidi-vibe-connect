-- =====================================================
-- Activity Tracking Tables
-- These power the three "manual" stats in user_stats:
--   venues_visited  → venue_check_ins
--   events_attended → event_rsvps
--   reviews_written → venue_reviews
--
-- Each table has a UNIQUE(user_id, <resource_id>)
-- constraint so a user can only earn the stat credit
-- once per venue/event regardless of how many times
-- they tap the button.
-- =====================================================

-- ── 1. Venue Check-ins ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.venue_check_ins (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  venue_id     UUID        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, venue_id)   -- one stat credit per venue per user
);

CREATE INDEX IF NOT EXISTS idx_venue_check_ins_user  ON public.venue_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_check_ins_venue ON public.venue_check_ins(venue_id);

ALTER TABLE public.venue_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "check_ins_select" ON public.venue_check_ins;
CREATE POLICY "check_ins_select" ON public.venue_check_ins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "check_ins_insert" ON public.venue_check_ins;
CREATE POLICY "check_ins_insert" ON public.venue_check_ins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- ── 2. Event RSVPs ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id       UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID  NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  event_id UUID  NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status   TEXT  NOT NULL DEFAULT 'going'
                 CHECK (status IN ('going', 'interested', 'not_going')),
  rsvp_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)   -- one stat credit per event per user
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_user  ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON public.event_rsvps(event_id);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rsvps_select" ON public.event_rsvps;
CREATE POLICY "rsvps_select" ON public.event_rsvps
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rsvps_insert" ON public.event_rsvps;
CREATE POLICY "rsvps_insert" ON public.event_rsvps
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rsvps_update" ON public.event_rsvps;
CREATE POLICY "rsvps_update" ON public.event_rsvps
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);


-- ── 3. Venue Reviews ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.venue_reviews (
  id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID     NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  venue_id   UUID     NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  rating     INTEGER  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, venue_id)   -- one review + stat credit per venue per user
);

CREATE INDEX IF NOT EXISTS idx_venue_reviews_user  ON public.venue_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue ON public.venue_reviews(venue_id);

ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (useful for showing ratings later)
DROP POLICY IF EXISTS "reviews_select" ON public.venue_reviews;
CREATE POLICY "reviews_select" ON public.venue_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert" ON public.venue_reviews;
CREATE POLICY "reviews_insert" ON public.venue_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_update" ON public.venue_reviews;
CREATE POLICY "reviews_update" ON public.venue_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
