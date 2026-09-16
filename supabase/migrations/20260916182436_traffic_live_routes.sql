-- Live traffic: real-time travel-time data for a small, curated set of named
-- Lagos routes, sitting alongside (not replacing) the radio-narrative reports
-- in `traffic_reports`.
--
-- Why a separate table: traffic_reports is an append-only log of scraped
-- radio posts — many rows per route over time, route_label is free text a
-- classifier produced per post ('Ikorodu Road', 'Ikorodu Axis', 'Ikorodu' all
-- exist for the same corridor). This is the opposite shape: a small FIXED set
-- of routes we define ourselves, each with exactly ONE row that gets
-- overwritten with fresh numbers on every run. Folding it into
-- traffic_reports would mean either polluting that log with a different kind
-- of row, or trying to match free-text labels against a canonical list —
-- fragile, given the free-text vocabulary already disagrees with itself.

CREATE TABLE IF NOT EXISTS public.traffic_live_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable identity for UPSERT. Never shown to users.
  route_key TEXT UNIQUE NOT NULL,

  -- What the app displays.
  route_label TEXT NOT NULL,

  -- What was actually sent to the Routes API — kept for debugging a bad
  -- reading without having to cross-reference the script's source.
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,

  -- Google's traffic-aware duration right now, and its typical/free-flow
  -- duration with no traffic. The ratio between them is the whole signal.
  duration_seconds INTEGER,
  typical_duration_seconds INTEGER,
  distance_meters INTEGER,

  -- Derived from the duration ratio at write time — see live-traffic-agent.js.
  -- Deliberately excludes 'closed': a long duration and a closed road look
  -- identical to this signal, and only a human-sourced report can tell them
  -- apart. That distinction stays with traffic_reports.
  severity TEXT CHECK (severity IN ('light', 'moderate', 'heavy', 'critical')),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_live_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read traffic_live_routes"
  ON public.traffic_live_routes FOR SELECT
  TO anon, authenticated
  USING (true);

-- No authenticated write policy, by design — every write comes from
-- live-traffic-agent.js via the service role, which bypasses RLS entirely.
-- Mirrors traffic_reports, which has the same shape (public read, no
-- authenticated write policy) for the same reason.

COMMENT ON TABLE public.traffic_live_routes IS
  'One row per curated Lagos route, overwritten on every live-traffic-agent.js run. Quantitative (how much slower than normal, right now) — pairs with the qualitative, human-sourced traffic_reports.';
