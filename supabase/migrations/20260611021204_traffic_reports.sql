-- Crowdsourced-via-AI traffic reports. Populated by scripts/lagos-traffic-agent.js
-- (GitHub Actions hourly) which scrapes Lagos Traffic Radio 96.1FM, feeds each post
-- through the traffic_agent (Haiku 4.5 classification), and inserts structured rows here.
--
-- Consumer TrafficAlert reads from this table (expires_at > NOW()).
-- TomTom is removed from the mobile bundle once this is shipping reports.

CREATE TABLE IF NOT EXISTS public.traffic_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_label          TEXT NOT NULL,                       -- e.g. "3rd Mainland Bridge", "Lekki-Epe Expressway"
  area                 TEXT,                                -- "Mainland" | "Island" | "Lekki" | "Mainland-Outer" | NULL
  severity             TEXT NOT NULL CHECK (severity IN ('light','moderate','heavy','critical','closed')),
  summary              TEXT NOT NULL,                       -- 1-2 sentence AI-generated summary
  source_name          TEXT NOT NULL DEFAULT 'Lagos Traffic Radio 96.1FM',
  source_url           TEXT NOT NULL UNIQUE,                -- permalink — also the dedup key
  source_published_at  TIMESTAMPTZ,                         -- parsed from the post's date line
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 hours',
  confidence           NUMERIC(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  scraped_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot path: TrafficAlert filters by expires_at > NOW() ORDER BY source_published_at DESC.
CREATE INDEX IF NOT EXISTS traffic_reports_active_idx
  ON public.traffic_reports (source_published_at DESC NULLS LAST)
  WHERE expires_at > NOW();

-- Expiry sweep (a nightly cleanup may use this).
CREATE INDEX IF NOT EXISTS traffic_reports_expires_idx
  ON public.traffic_reports (expires_at);

-- RLS: public read (this is end-user info), service-role / admin writes only.
ALTER TABLE public.traffic_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='traffic_reports' AND policyname='Public can read traffic_reports') THEN
    CREATE POLICY "Public can read traffic_reports"
      ON public.traffic_reports FOR SELECT TO anon, authenticated USING (TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='traffic_reports' AND policyname='Admins delete traffic_reports') THEN
    CREATE POLICY "Admins delete traffic_reports"
      ON public.traffic_reports FOR DELETE TO authenticated USING (is_admin());
  END IF;
END$$;

-- Register the new agent's feature flag (off by default — flip on after smoke test).
INSERT INTO public.feature_flags (key, enabled, value, description) VALUES
  ('agents.traffic_agent', FALSE, '{}'::JSONB,
    'Enable the traffic-classification agent. Reads scraped Lagos Traffic Radio posts and writes structured rows to traffic_reports.')
ON CONFLICT (key) DO NOTHING;
