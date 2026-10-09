-- ============================================================================
-- news: one row per article URL, enforced by the database
-- ============================================================================
--
-- WHY
--
-- `scripts/lagos-news-agent.js` has always had a dedupe guard: before
-- scraping it loads existing `external_url` values into a Set and skips any
-- article already present. The guard did almost nothing, because
--
--     .from('news').select('external_url')
--
-- has no limit and no order, and **PostgREST caps every response at
-- `db-max-rows` (1000 here)**. So it loaded 870 URLs out of 38,635 rows — 2% —
-- and with no ORDER BY the slice came back in physical order, which is the
-- oldest rows. Nothing recent was ever in the set, so every run re-inserted
-- everything it had just scraped.
--
-- Measured before this migration:
--
--     total rows        38,635
--     distinct URLs      4,788
--     redundant rows    33,847   (88%)
--
-- In one 24-hour window: 83 rows inserted, 22 distinct URLs. A single story
-- ("Apply now: Lagos local government announces vacancy") was inserted eight
-- times from one URL across 17 hours.
--
-- The client-side Set is now paginated and windowed, which fixes it in
-- practice. This migration is the guarantee: a client-side check is an
-- optimisation, a UNIQUE index is a boundary. Same principle as RLS versus a
-- client-side filter.
--
-- WHAT THIS DELETES — READ BEFORE APPLYING
--
-- Roughly 33,847 rows. For each `external_url` it keeps exactly one row,
-- preferring, in order:
--
--   1. a curated row (gidi_headline IS NOT NULL) — that brief cost a Gemini
--      call and the body fetch behind it, so it is the expensive copy
--   2. an active row over an inactive one
--   3. the oldest row, which is the one the editor agent pointed other
--      outlets' copies at via duplicate_of
--
-- `news_duplicate_of_fkey` is ON DELETE SET NULL and nothing else references
-- news(id), so this cannot cascade anywhere. One consequence to know about: if
-- a row at a *different* URL had been marked duplicate_of one of the deleted
-- copies, its pointer becomes NULL and it re-enters the feed. The editor agent
-- re-marks it on its next pass. Cross-outlet duplicates are unaffected
-- otherwise — they have different URLs and are not touched here.
--
-- Projected read-only before writing this, by running the same ranking as a
-- SELECT against production:
--
--     rows before          38,635
--     rows after            4,788
--     rows deleted         33,847
--     briefs kept             357
--     briefs lost              13
--     kept in 24h window        9
--
-- The 13 lost briefs are not curated rows losing to uncurated ones — the
-- ranking makes that impossible, since `gidi_headline IS NOT NULL` sorts
-- first. They are 13 cases where two copies of the SAME url were both
-- briefed, so the redundant brief of an identical article goes.
--
-- Counts are reported by the RAISE NOTICE below so the result is visible
-- rather than assumed.
-- ============================================================================

BEGIN;

-- Headroom for the one-off bulk delete, set before anything runs. LOCAL, so
-- it reverts at COMMIT and never changes the role default. With the index in
-- step 0 the delete takes seconds; this exists so a busy instance cannot fail
-- the migration part-way and leave the table indexed but un-deduped.
SET LOCAL statement_timeout = '15min';
SET LOCAL lock_timeout = '30s';

-- ── 0. Make the delete possible at all ──────────────────────────────────────
--
-- The first attempt at this migration died on `statement_timeout` (2 min) and
-- the reason was not the delete. `news_duplicate_of_fkey` is a SELF-reference
-- with ON DELETE SET NULL, and **there was no index on news.duplicate_of** —
-- only `news_feed_idx`, whose predicate mentions the column without indexing
-- it. So every deleted row made Postgres scan all 38,635 rows looking for
-- referrers.
--
-- Measured with EXPLAIN (ANALYZE) on a 93-row batch, before and after adding
-- the index below:
--
--     Trigger for constraint news_duplicate_of_fkey: time=850.459 calls=93
--     Trigger for constraint news_duplicate_of_fkey: time=  2.136 calls=93
--
-- 9.14 ms per row versus 0.023 ms — a 398x difference. Across 33,847 rows
-- that is 5.2 minutes of trigger time versus under a second, against a
-- two-minute ceiling. **An unindexed referencing column on a self-FK turns a
-- bulk delete into O(n x m)**, and the symptom is a timeout that looks like
-- the delete being too big when it is really the constraint check.
--
-- The index is kept afterwards, not dropped: `duplicate_of IS NULL` is in the
-- feed's hot path and every future delete pays the same cost without it.
CREATE INDEX IF NOT EXISTS news_duplicate_of_idx
  ON public.news (duplicate_of)
  WHERE duplicate_of IS NOT NULL;

COMMENT ON INDEX public.news_duplicate_of_idx IS
  'Supports the ON DELETE SET NULL check on the news_duplicate_of_fkey '
  'self-reference. Without it a bulk delete scans the whole table once per '
  'deleted row — this is why the 2026-10-09 dedupe migration first timed out.';

-- ── 1. Collapse to one row per URL ──────────────────────────────────────────
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY external_url
      ORDER BY
        (gidi_headline IS NOT NULL) DESC,  -- keep the brief we paid for
        is_active DESC,
        created_at ASC                      -- then the original
    ) AS rn
  FROM public.news
  WHERE external_url IS NOT NULL
)
DELETE FROM public.news n
USING ranked r
WHERE n.id = r.id AND r.rn > 1;

-- ── 2. A row cannot be its own duplicate ────────────────────────────────────
-- Possible once the copy a row pointed at has been collapsed into it.
UPDATE public.news SET duplicate_of = NULL WHERE duplicate_of = id;

-- ── 3. The guarantee ────────────────────────────────────────────────────────
-- Partial, because external_url is nullable and several hand-entered rows
-- legitimately have none; NULLs are distinct in Postgres anyway, but being
-- explicit documents the intent.
DROP INDEX IF EXISTS public.news_external_url_idx;

CREATE UNIQUE INDEX IF NOT EXISTS news_external_url_key
  ON public.news (external_url)
  WHERE external_url IS NOT NULL;

COMMENT ON INDEX public.news_external_url_key IS
  'One row per article URL. The scraper re-inserted everything on every run '
  'for months because its client-side dedupe silently read only the first '
  '1000 rows (PostgREST db-max-rows); 88% of the table was copies. The '
  'scraper now upserts with ignoreDuplicates against this index.';

DO $$
DECLARE
  total   bigint;
  urls    bigint;
BEGIN
  SELECT count(*), count(DISTINCT external_url) INTO total, urls FROM public.news;
  RAISE NOTICE 'news after dedupe: % rows, % distinct URLs', total, urls;
END $$;

COMMIT;
