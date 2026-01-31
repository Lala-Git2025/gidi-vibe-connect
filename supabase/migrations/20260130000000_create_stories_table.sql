-- Ensure pgcrypto extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop stories table if present (CASCADE removes dependent objects)
DROP TABLE IF EXISTS public.stories CASCADE;

-- Create stories table
-- NOTE: profiles PK is 'id', not 'user_id'
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- Create indexes
CREATE INDEX stories_user_id_idx ON public.stories(user_id);
CREATE INDEX stories_expires_at_idx ON public.stories(expires_at);
CREATE INDEX stories_created_at_idx ON public.stories(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view active stories
DROP POLICY IF EXISTS "Anyone can view active stories" ON public.stories;
CREATE POLICY "Anyone can view active stories"
  ON public.stories
  FOR SELECT
  TO authenticated
  USING (expires_at > NOW());

-- RLS Policy: Users can create their own stories
DROP POLICY IF EXISTS "Users can create own stories" ON public.stories;
CREATE POLICY "Users can create own stories"
  ON public.stories
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- RLS Policy: Users can delete their own stories
DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories"
  ON public.stories
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Function to automatically delete expired stories
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.stories
  WHERE expires_at <= NOW();
END;
$$;

-- NOTE: Create storage bucket 'stories' via Supabase Dashboard or JS API
-- Dashboard: Storage > New Bucket > Name: 'stories', Public: true
-- Or use: supabase.storage.createBucket('stories', { public: true })

-- Storage RLS: Allow public read of story images (if bucket is public)
DROP POLICY IF EXISTS "Anyone can view story images" ON storage.objects;
CREATE POLICY "Anyone can view story images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'stories');

-- Storage RLS: Allow authenticated users to upload to stories bucket
DROP POLICY IF EXISTS "Authenticated users can upload story images" ON storage.objects;
CREATE POLICY "Authenticated users can upload story images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
  );

-- Storage RLS: Users can delete their own story images (folder = user UUID)
DROP POLICY IF EXISTS "Users can delete own story images" ON storage.objects;
CREATE POLICY "Users can delete own story images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'stories'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );
