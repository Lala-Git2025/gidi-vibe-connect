-- =====================================================
-- Poll post type.
--
-- "Where should we eat tonight?" / "Best DJ at Hard Rock this weekend?" —
-- polls are the highest-leverage post type for a Lagos community app.
-- Implementation:
--   - social_posts gains a post_type column ('standard' | 'poll'). Existing
--     rows default to 'standard'; consumer-app render branches on it.
--   - poll_options stores 2-4 choices per poll with a denormalized votes_count.
--   - poll_votes is one-row-per-user-per-poll, enforced by UNIQUE(post_id, user_id).
--   - Trigger keeps poll_options.votes_count in sync. Counter pattern matches
--     the existing post_likes / comments counter triggers.
-- =====================================================

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (post_type IN ('standard', 'poll'));

CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  position    SMALLINT NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, position)
);
CREATE INDEX IF NOT EXISTS idx_poll_options_post ON public.poll_options (post_id);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  option_id  UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id) -- one vote per user per poll; switch requires delete+insert
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON public.poll_votes (post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON public.poll_votes (user_id);

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Options are public (visible to anyone who can see the post).
CREATE POLICY "Anyone can read poll_options"
  ON public.poll_options FOR SELECT
  TO anon, authenticated USING (TRUE);

-- The post author inserts their own options at create-time.
CREATE POLICY "Author inserts own poll_options"
  ON public.poll_options FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );

-- Anyone signed in can read votes (needed for tallying — counts are also
-- denormalised on poll_options).
CREATE POLICY "Anyone can read poll_votes"
  ON public.poll_votes FOR SELECT
  TO authenticated USING (TRUE);

-- A user can cast their own vote.
CREATE POLICY "Users insert own poll_vote"
  ON public.poll_votes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- A user can change/withdraw their own vote.
CREATE POLICY "Users delete own poll_vote"
  ON public.poll_votes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── Counter trigger: keep poll_options.votes_count in sync ─────────────
CREATE OR REPLACE FUNCTION public.update_poll_option_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.poll_options SET votes_count = votes_count + 1 WHERE id = NEW.option_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poll_options SET votes_count = GREATEST(votes_count - 1, 0) WHERE id = OLD.option_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_update_poll_option_count_ins ON public.poll_votes;
DROP TRIGGER IF EXISTS trg_update_poll_option_count_del ON public.poll_votes;
CREATE TRIGGER trg_update_poll_option_count_ins
  AFTER INSERT ON public.poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_poll_option_count();
CREATE TRIGGER trg_update_poll_option_count_del
  AFTER DELETE ON public.poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_poll_option_count();
