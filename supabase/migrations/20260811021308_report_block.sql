-- =====================================================
-- post_reports + blocked_users: UGC safety surfaces.
--
-- Google Play's User-Generated Content policy requires in-app content
-- reporting and user blocking. post_reports doubles as the trigger
-- surface for the moderation_triage agent (AI_AGENTS_PLAN §5.1) —
-- each new report can invoke agent-runner with {post_id}.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One report per reporter per target. comment_id NULL = the post itself;
  -- NULLS NOT DISTINCT so double-reporting a post conflicts instead of duplicating.
  UNIQUE NULLS NOT DISTINCT (post_id, comment_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_status_created
  ON public.post_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON public.post_reports (post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_comment_id ON public.post_reports (comment_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_id ON public.post_reports (reporter_id);

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Reporters file reports as themselves.
CREATE POLICY "Users insert own reports"
  ON public.post_reports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = reporter_id);

-- Reporters see their own reports; admins see all.
CREATE POLICY "Users view own reports, admins all"
  ON public.post_reports FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = reporter_id OR is_admin());

-- Only admins move reports through the review pipeline.
CREATE POLICY "Admins update reports"
  ON public.post_reports FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================

CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users manage and see only their own block list.
CREATE POLICY "Users view own blocks"
  ON public.blocked_users FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = blocker_id);

CREATE POLICY "Users insert own blocks"
  ON public.blocked_users FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = blocker_id);

CREATE POLICY "Users delete own blocks"
  ON public.blocked_users FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = blocker_id);
