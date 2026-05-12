-- =============================================================================
-- Post counter triggers — keep social_posts.likes_count & comments_count
-- in sync server-side instead of relying on the client to UPDATE the row
-- after every insert/delete.
--
-- Previous behaviour (pre-2026-05-11): SocialScreen manually called
--   supabase.from('social_posts').update({ likes_count: ... })
-- after toggling likes/comments. That was racy across multi-device usage
-- and drifted over time. These triggers replace that.
-- =============================================================================

-- ─── likes_count ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts
    SET likes_count = COALESCE(likes_count, 0) + 1,
        updated_at = now()
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0),
        updated_at = now()
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_post_likes_count ON public.post_likes;
CREATE TRIGGER trg_update_post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_likes_count();

-- ─── comments_count ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts
    SET comments_count = COALESCE(comments_count, 0) + 1,
        updated_at = now()
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts
    SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0),
        updated_at = now()
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_post_comments_count ON public.comments;
CREATE TRIGGER trg_update_post_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_comments_count();

-- ─── One-time backfill to repair any drift from the old manual-sync era ─────

UPDATE public.social_posts sp
SET likes_count = (
  SELECT COUNT(*) FROM public.post_likes WHERE post_id = sp.id
);

UPDATE public.social_posts sp
SET comments_count = (
  SELECT COUNT(*) FROM public.comments WHERE post_id = sp.id
);
