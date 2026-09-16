-- Gidi News: columns for the editorial pass that turns scraped headlines into
-- content read inside the app.
--
-- What the news table held: title, a 150-character snippet in `summary`, a
-- per-source category that is often wrong (a Wike/APC story filed under
-- "nightlife"), an external_url the app opened in the browser, and the same
-- story several times over from different sources. Nothing in it was written
-- for Gidi; the app was a list of links out.
--
-- What it holds after the editor agent runs: a headline and a 3-5 sentence
-- brief in Gidi's own voice, a category from a taxonomy that means something
-- to a going-out audience, a relevance score so the feed can be curated rather
-- than dumped, and duplicates marked so one story appears once. The original
-- title, snippet and URL are kept — the source is always credited.

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS gidi_headline  TEXT,
  ADD COLUMN IF NOT EXISTS brief          TEXT,
  ADD COLUMN IF NOT EXISTS gidi_category  TEXT,
  ADD COLUMN IF NOT EXISTS relevance      SMALLINT,
  ADD COLUMN IF NOT EXISTS tags           TEXT[],
  ADD COLUMN IF NOT EXISTS dedupe_key     TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_of   UUID REFERENCES public.news(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS body_fetched   BOOLEAN,
  ADD COLUMN IF NOT EXISTS curated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS curation_model TEXT;

ALTER TABLE public.news DROP CONSTRAINT IF EXISTS news_relevance_range;
ALTER TABLE public.news
  ADD CONSTRAINT news_relevance_range CHECK (relevance IS NULL OR relevance BETWEEN 0 AND 100);

ALTER TABLE public.news DROP CONSTRAINT IF EXISTS news_gidi_category_known;
ALTER TABLE public.news
  ADD CONSTRAINT news_gidi_category_known CHECK (
    gidi_category IS NULL OR gidi_category IN (
      'nightlife', 'food-drink', 'music', 'events', 'culture',
      'city', 'traffic', 'business', 'sport', 'politics', 'other'
    )
  );

-- The editor's worklist: recent rows that have not been curated. Partial so
-- it stays tiny however large the table grows.
CREATE INDEX IF NOT EXISTS news_uncurated_idx
  ON public.news (publish_date DESC)
  WHERE curated_at IS NULL AND is_active;

-- Cross-source duplicate detection keys on a normalised title.
CREATE INDEX IF NOT EXISTS news_dedupe_key_idx ON public.news (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- The feed reads curated, non-duplicate, relevant rows newest-first.
CREATE INDEX IF NOT EXISTS news_feed_idx
  ON public.news (publish_date DESC)
  WHERE is_active AND duplicate_of IS NULL;

-- `source` carries junk values like 'AI Agent' for a good share of rows. Derive
-- a real publisher name from the URL for the ones the feed will actually show.
-- The editor agent does the same for every row it touches from here on.
UPDATE public.news SET source = CASE
    WHEN external_url ~* 'punchng\.com'           THEN 'The Punch'
    WHEN external_url ~* 'premiumtimesng\.com'    THEN 'Premium Times'
    WHEN external_url ~* 'bellanaija\.com'        THEN 'BellaNaija'
    WHEN external_url ~* 'lindaikejisblog\.com'   THEN 'Linda Ikeji Blog'
    WHEN external_url ~* 'pulse\.ng'              THEN 'Pulse Nigeria'
    WHEN external_url ~* 'legit\.ng'              THEN 'Legit.ng'
    WHEN external_url ~* 'vanguardngr\.com'       THEN 'Vanguard'
    WHEN external_url ~* 'guardian\.ng'           THEN 'The Guardian'
    WHEN external_url ~* 'thecable\.ng'           THEN 'The Cable'
    WHEN external_url ~* 'dailypost\.ng'          THEN 'Daily Post'
    WHEN external_url ~* 'notjustok\.com'         THEN 'NotJustOK'
    WHEN external_url ~* 'thenationonlineng\.net' THEN 'The Nation'
    WHEN external_url ~* 'channelstv\.com'        THEN 'Channels TV'
    WHEN external_url ~* 'thisdaylive\.com'       THEN 'ThisDay'
    ELSE source
  END
WHERE publish_date > now() - interval '14 days'
  AND (source IS NULL OR source IN ('AI Agent', 'Unknown Source', 'Lagos News'));

COMMENT ON COLUMN public.news.brief IS
  'Gidi-written summary read in-app. Original facts only; never adds detail the source lacks. The source is always credited alongside it.';
