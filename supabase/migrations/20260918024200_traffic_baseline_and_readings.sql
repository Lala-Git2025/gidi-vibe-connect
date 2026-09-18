-- Traffic: a real time-of-day baseline, so the app can say "worse than usual"
-- and mean it.
--
-- The problem this fixes. `traffic_live_routes.typical_duration_seconds` holds
-- Google's `staticDuration` — the drive with NO traffic at all. It is not a
-- typical duration and the column name has been lying about that. On Third
-- Mainland it reads 16 minutes; the actual Tuesday-8am expectation is 31. So
-- "+15 min vs normal" was measured against a road that has never existed, every
-- busy corridor read HEAVY all day, and the severity badge stopped
-- discriminating exactly where users needed it.
--
-- The fix. Google's Routes API accepts a FUTURE departureTime for driving and
-- returns its historical prediction for that slot. Probed against Third
-- Mainland before building this: 07:00 Tue = 31 min, 11:00 = 20, 18:00 = 18,
-- Sun 11:00 = 15, free-flow 16 throughout. It captures both Lagos rush hour and
-- the direction asymmetry (this route runs INTO the island, so it peaks in the
-- morning and is nearly clear at 6pm). That gives a per-hour baseline on day
-- one rather than after weeks of self-collected history.

-- ── Baseline ────────────────────────────────────────────────────────────────
-- What each corridor is EXPECTED to take, per hour, split weekday/weekend.
-- Small and fixed (8 routes x 2 x 24 = 384 rows), rewritten weekly in place by
-- scripts/traffic-baseline-agent.js. Weekday/weekend is the only split worth
-- making: finer day-of-week buckets quadruple the API cost to separate Tuesday
-- from Wednesday, which in Lagos are the same day.

CREATE TABLE IF NOT EXISTS public.traffic_route_baseline (
  route_key TEXT NOT NULL,
  day_type  TEXT NOT NULL CHECK (day_type IN ('weekday', 'weekend')),
  hour      SMALLINT NOT NULL CHECK (hour BETWEEN 0 AND 23),

  -- Google's predicted traffic-aware duration for this slot.
  expected_duration_seconds INTEGER NOT NULL,
  -- The no-traffic duration, kept alongside so the two are never confused
  -- again. This is what the old `typical_duration_seconds` actually was.
  free_flow_seconds INTEGER,

  -- 'google_prediction' today. Leaves room to recompute from our own observed
  -- history later without a schema change — see traffic_route_readings.
  source TEXT NOT NULL DEFAULT 'google_prediction',

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (route_key, day_type, hour)
);

ALTER TABLE public.traffic_route_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read traffic_route_baseline"
  ON public.traffic_route_baseline FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.traffic_route_baseline IS
  'Expected duration per route per (weekday|weekend, hour), from Google predictions for a future departureTime. The thing "worse than usual" is measured against.';

-- ── Readings ────────────────────────────────────────────────────────────────
-- Every live reading, appended. The live table keeps ONE row per route and
-- overwrites it hourly, which meant every observation was being destroyed an
-- hour after it was taken. This keeps them.
--
-- Two things it buys: a Lagos-specific check on Google's predicted baseline
-- (source can become 'observed' once there is enough history), and the ability
-- to answer "when does this usually clear", which needs a curve rather than a
-- point.

CREATE TABLE IF NOT EXISTS public.traffic_route_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  duration_seconds  INTEGER NOT NULL,
  free_flow_seconds INTEGER,
  -- What the baseline said this slot should be, captured at write time so a
  -- later baseline refresh cannot retroactively change what we reported.
  expected_duration_seconds INTEGER,

  severity TEXT CHECK (severity IN ('light', 'moderate', 'heavy', 'critical')),
  vs_usual TEXT CHECK (vs_usual IN ('better', 'normal', 'worse', 'much_worse'))
);

-- BRIN, matching the convention for every other time-series table here
-- (venue_check_ins, story_views, event_rsvps): append-only, naturally ordered
-- by time, and queried in ranges.
CREATE INDEX IF NOT EXISTS traffic_route_readings_observed_at_brin
  ON public.traffic_route_readings USING BRIN (observed_at);

CREATE INDEX IF NOT EXISTS traffic_route_readings_route_observed_idx
  ON public.traffic_route_readings (route_key, observed_at DESC);

ALTER TABLE public.traffic_route_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read traffic_route_readings"
  ON public.traffic_route_readings FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.traffic_route_readings IS
  'Append-only log of every live-traffic-agent.js reading. The live table overwrites; this remembers.';

-- ── Live table gains the comparison ─────────────────────────────────────────
-- The app should not have to join the baseline to render a row, and the
-- comparison must be pinned to the baseline that was in force when the reading
-- was taken, so it is resolved at write time.

ALTER TABLE public.traffic_live_routes
  ADD COLUMN IF NOT EXISTS expected_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS vs_usual TEXT;

ALTER TABLE public.traffic_live_routes
  DROP CONSTRAINT IF EXISTS traffic_live_routes_vs_usual_check;

ALTER TABLE public.traffic_live_routes
  ADD CONSTRAINT traffic_live_routes_vs_usual_check
  CHECK (vs_usual IS NULL OR vs_usual IN ('better', 'normal', 'worse', 'much_worse'));

COMMENT ON COLUMN public.traffic_live_routes.vs_usual IS
  'duration vs the baseline for this route at this hour. NULL means no baseline row yet — show the plain severity and no comparison rather than inventing one.';

-- Naming the lie rather than renaming the column: `typical_duration_seconds`
-- is read by the shipped app, and a rename breaks every client that has not
-- updated. The comment is load-bearing for the next person.
COMMENT ON COLUMN public.traffic_live_routes.typical_duration_seconds IS
  'MISNOMER, kept for client compatibility: this is Google staticDuration, the FREE-FLOW drive with no traffic — not a typical one. For what the road usually takes, use expected_duration_seconds.';
