-- =====================================================
-- Fix stories.user_id FK: was pointing to profiles(id)
-- (the auto-generated UUID PK of profiles) but the app
-- inserts auth.uid() which is auth.users.id — a different
-- UUID. Change FK to reference auth.users(id) directly,
-- consistent with user_stats and all other tables.
-- =====================================================

ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_user_id_fkey;

ALTER TABLE public.stories
  ADD CONSTRAINT stories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =====================================================
-- Ensure the 'stories' storage bucket exists
-- (was only documented as a comment in previous migration)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories',
  'stories',
  true,
  52428800, -- 50 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Create story_views table for Instagram-like seen tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.story_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON public.story_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_story_views_story  ON public.story_views(story_id);

-- Enable RLS
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-running
DROP POLICY IF EXISTS "Viewers can see own views"       ON public.story_views;
DROP POLICY IF EXISTS "Story owners can see their views" ON public.story_views;
DROP POLICY IF EXISTS "Users can mark stories seen"      ON public.story_views;

-- Viewers can query which stories they've seen
CREATE POLICY "Viewers can see own views"
  ON public.story_views FOR SELECT
  TO authenticated
  USING (viewer_id = auth.uid());

-- Story owners can see who viewed their stories
CREATE POLICY "Story owners can see their views"
  ON public.story_views FOR SELECT
  TO authenticated
  USING (
    story_id IN (
      SELECT id FROM public.stories WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can record a story view
CREATE POLICY "Users can mark stories seen"
  ON public.story_views FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid());
