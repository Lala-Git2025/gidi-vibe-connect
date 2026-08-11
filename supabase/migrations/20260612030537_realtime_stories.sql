-- =====================================================
-- Enable Supabase Realtime on stories.
--
-- StorySection subscribes to INSERTs so a friend posting a vibe appears
-- in the rail without pull-to-refresh. The public read policy already
-- gates this to active stories (expires_at > now()), so any logged-in
-- user can safely listen.
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'stories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
  END IF;
END $$;
