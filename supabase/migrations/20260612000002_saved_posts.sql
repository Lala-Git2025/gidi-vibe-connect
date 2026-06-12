-- =====================================================
-- saved_posts: users can bookmark social_posts.
--
-- Standard social-app affordance — Instagram, Twitter, Reddit all have
-- it. Strong retention signal ("I'll come back to this") and cheap to
-- ship. The Profile 'Saved' tab is a follow-up.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user_created
  ON public.saved_posts (user_id, created_at DESC);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Users see only their own saves.
CREATE POLICY "Users view own saved_posts"
  ON public.saved_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only save on behalf of themselves.
CREATE POLICY "Users insert own saved_posts"
  ON public.saved_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave their own saves.
CREATE POLICY "Users delete own saved_posts"
  ON public.saved_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
