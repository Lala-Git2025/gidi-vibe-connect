-- ============================================================================
-- news: make the unique index on external_url NON-partial, so ON CONFLICT
--       can actually infer it
-- ============================================================================
--
-- Corrects 20261009000000, which created:
--
--   CREATE UNIQUE INDEX news_external_url_key
--     ON public.news (external_url) WHERE external_url IS NOT NULL;
--
-- The predicate was added to document intent. It silently broke the thing the
-- index exists for.
--
-- **Postgres cannot infer a PARTIAL index from `ON CONFLICT (col)`.** Index
-- inference requires the index predicate to be implied by the statement, and
-- an INSERT has no WHERE clause to imply it; the predicate must be restated as
-- `ON CONFLICT (col) WHERE <predicate>`. PostgREST's `on_conflict` parameter
-- passes column names only and cannot express it. Verified against production:
--
--   INSERT ... ON CONFLICT (external_url) DO NOTHING
--   → ERROR 42P10: there is no unique or exclusion constraint matching the
--     ON CONFLICT specification
--
-- and with a plain unique index in place, the same statement succeeds and
-- skips the duplicate.
--
-- Why that was worse than having no index at all: the scraper's upsert would
-- fail inference, fall through to its plain-insert fallback, and the insert
-- would then hit **23505 unique_violation** on the first duplicate URL —
-- failing the whole batch and writing nothing. The partial index turned a
-- guarantee into an outage waiting for one duplicate.
--
-- Dropping the predicate changes nothing semantically. `external_url` has no
-- NULLs today, and a plain UNIQUE index permits multiple NULLs anyway, since
-- NULLs are not equal to one another in Postgres. So the two indexes enforce
-- exactly the same rule; only one of them can be inferred.
-- ============================================================================

BEGIN;

DROP INDEX IF EXISTS public.news_external_url_key;

CREATE UNIQUE INDEX IF NOT EXISTS news_external_url_key
  ON public.news (external_url);

COMMENT ON INDEX public.news_external_url_key IS
  'One row per article URL. Deliberately NOT partial: a partial unique index '
  'cannot be inferred by ON CONFLICT (external_url), which is how the scraper '
  'upserts. NULLs are distinct in Postgres, so this permits multiple NULL '
  'external_url rows exactly as the partial version did.';

COMMIT;
