-- Traffic baseline: day-of-week, not weekday/weekend.
--
-- The table shipped an hour ago with a `day_type` of 'weekday' | 'weekend'.
-- Probing Google's predictions for Third Mainland at 07:00 killed that idea
-- before any data was written:
--
--     Mon 42 min · Tue 31 · Wed 29 · Thu 24 · Fri 22 · Sat 15 · Sun 14
--
-- Monday morning is nearly twice Friday morning on the same road, and the
-- Mon→Fri decline is monotonic. Collapsing those into one bucket means picking
-- some middle value and then reporting every Monday as "much worse than usual"
-- and every Friday as "better than usual" — for the most predictable jam of
-- the week. A baseline whose entire job is to define "usual" cannot call the
-- regular Monday commute an anomaly.
--
-- Cost of the change: 8 routes x 7 days x 24 hours = 1,344 Compute Routes calls
-- per refresh instead of 384. Absorbed by moving the refresh from weekly to
-- MONTHLY — a historical traffic model does not move week to week, and monthly
-- keeps the combined Routes usage (this plus the hourly live agent) near the
-- free allowance instead of several times over it.
--
-- Safe as a destructive change: the table has never been written to. The live
-- agent reports `no baseline` and omits the comparison when a row is missing,
-- so there is no window where the app shows something wrong.

DROP TABLE IF EXISTS public.traffic_route_baseline;

CREATE TABLE public.traffic_route_baseline (
  route_key TEXT NOT NULL,

  -- 0 = Sunday .. 6 = Saturday, matching JavaScript's Date#getUTCDay so the
  -- agent and the app never disagree about which day a bucket is.
  dow  SMALLINT NOT NULL CHECK (dow BETWEEN 0 AND 6),
  hour SMALLINT NOT NULL CHECK (hour BETWEEN 0 AND 23),

  -- Google's predicted traffic-aware duration for this slot.
  expected_duration_seconds INTEGER NOT NULL,
  -- The no-traffic duration, kept alongside so the two are never confused
  -- again. This is what the old `typical_duration_seconds` actually was.
  free_flow_seconds INTEGER,

  -- 'google_prediction' today. Leaves room to recompute from our own observed
  -- history later without a schema change — see traffic_route_readings.
  source TEXT NOT NULL DEFAULT 'google_prediction',

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (route_key, dow, hour)
);

ALTER TABLE public.traffic_route_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read traffic_route_baseline"
  ON public.traffic_route_baseline FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.traffic_route_baseline IS
  'Expected duration per route per (day-of-week, hour), from Google predictions for a future departureTime. The thing "worse than usual" is measured against. 8 routes x 7 x 24 = 1344 rows, refreshed monthly.';

COMMENT ON COLUMN public.traffic_route_baseline.dow IS
  '0=Sunday..6=Saturday, matching Date#getUTCDay. Full day-of-week rather than weekday/weekend because Monday and Friday differ by ~2x on the same corridor at the same hour.';
