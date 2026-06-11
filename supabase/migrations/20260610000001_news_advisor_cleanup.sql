-- Cleanup pass for advisor findings after 20260610000000_codify_news_table.
--
-- 1. Duplicate index on news (production already had idx_news_publish_date) — drop the one I added.
-- 2. Pre-existing "Public read access" + "Service role insert/update/delete" policies on news
--    were `USING TRUE / WITH CHECK TRUE` (open to any authenticated user, not actually
--    scoped to the service role). Service role bypasses RLS anyway, so these did nothing
--    useful and undercut the stricter admin-only policies added in the previous migration.
-- 3. Cover foreign keys on agent_proposals to avoid sequential scans on cascade delete.

DROP INDEX IF EXISTS public.news_publish_date_idx;

DROP POLICY IF EXISTS "Public read access"   ON public.news;
DROP POLICY IF EXISTS "Service role insert"  ON public.news;
DROP POLICY IF EXISTS "Service role update"  ON public.news;
DROP POLICY IF EXISTS "Service role delete"  ON public.news;

CREATE INDEX IF NOT EXISTS agent_proposals_run_idx
  ON agent_proposals (run_id);
CREATE INDEX IF NOT EXISTS agent_proposals_reviewed_by_idx
  ON agent_proposals (reviewed_by) WHERE reviewed_by IS NOT NULL;
