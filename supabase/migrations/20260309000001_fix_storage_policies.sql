-- Fix storage RLS policies for stories and avatars buckets.
-- Even on "public" buckets, Supabase requires explicit storage.objects
-- policies for public SELECT to work without auth tokens.

-- ── stories bucket ────────────────────────────────────────────────────────────

-- Allow anyone to read story files (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Stories public read'
  ) THEN
    CREATE POLICY "Stories public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'stories');
  END IF;
END $$;

-- Allow authenticated users to upload their own stories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Stories authenticated upload'
  ) THEN
    CREATE POLICY "Stories authenticated upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'stories'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow users to delete their own story files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Stories owner delete'
  ) THEN
    CREATE POLICY "Stories owner delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'stories'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- ── avatars bucket ────────────────────────────────────────────────────────────

-- Allow anyone to read avatars (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Avatars public read'
  ) THEN
    CREATE POLICY "Avatars public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Allow authenticated users to upload/update their own avatar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Avatars authenticated upload'
  ) THEN
    CREATE POLICY "Avatars authenticated upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Avatars authenticated update'
  ) THEN
    CREATE POLICY "Avatars authenticated update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- ── social-media bucket ───────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Social media public read'
  ) THEN
    CREATE POLICY "Social media public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'social-media');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Social media authenticated upload'
  ) THEN
    CREATE POLICY "Social media authenticated upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'social-media');
  END IF;
END $$;
