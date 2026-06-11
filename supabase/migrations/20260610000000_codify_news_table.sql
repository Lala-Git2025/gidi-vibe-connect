-- Codify the `news` table that's been running in production since the early days
-- via a manually-created table in the Supabase dashboard.
--
-- Consumer reads: apps/consumer-app/screens/{NewsScreen,HomeScreen}.tsx
-- Writers: scripts/lagos-news-agent.js (active, hourly cron), scripts/scrape-lagos-news.js,
--          scripts/clear-old-news.js, scripts/delete-fake-news.js, scripts/remove-duplicate-news.js, etc.
--
-- IF NOT EXISTS / IF NOT EXISTS DO NOTHING throughout — safe to re-run on prod where it exists.
--
-- The earlier `news_feed` table (in 20250822025738) is a DIFFERENT, orphaned table:
-- defined for user-authored blog posts that were never built. `fetch-lagos-news` edge fn
-- writes to it (also dead path). Cleanup of those tracked separately.

CREATE TABLE IF NOT EXISTS public.news (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  summary             TEXT,
  category            TEXT,
  external_url        TEXT,
  featured_image_url  TEXT,
  publish_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source              TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NewsScreen filters by `publish_date >= cutoff` and orders DESC — needs an index.
CREATE INDEX IF NOT EXISTS news_publish_date_idx ON public.news (publish_date DESC);

-- Dedup helper for the agent (scripts/remove-duplicate-news.js matches on external_url).
CREATE INDEX IF NOT EXISTS news_external_url_idx ON public.news (external_url) WHERE external_url IS NOT NULL;

-- RLS: public read (it's news for users), service-role-only writes (the agent uses service role).
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'news' AND policyname = 'Public can read news') THEN
    CREATE POLICY "Public can read news" ON public.news FOR SELECT TO anon, authenticated USING (TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'news' AND policyname = 'Admins update news') THEN
    CREATE POLICY "Admins update news" ON public.news FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'news' AND policyname = 'Admins delete news') THEN
    CREATE POLICY "Admins delete news" ON public.news FOR DELETE TO authenticated USING (is_admin());
  END IF;
END$$;
