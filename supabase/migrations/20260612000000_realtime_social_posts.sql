-- =====================================================
-- Enable Supabase Realtime on social_posts.
--
-- Consumer app SocialScreen subscribes to INSERT (new post pops in) and
-- UPDATE (likes_count / comments_count tick live) on this table. RLS still
-- applies — users only receive events for rows they could SELECT, so the
-- subscription is safe to open for any logged-in user.
--
-- Idempotent: only adds the table if not already published.
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'social_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
  END IF;
END $$;

-- REPLICA IDENTITY FULL so UPDATE payloads include all columns (default
-- only includes primary key + changed columns; we want likes_count etc.
-- even when only one column changed).
ALTER TABLE public.social_posts REPLICA IDENTITY FULL;
