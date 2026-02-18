-- Comprehensive fix for stories table schema and constraints
-- Run this in Supabase SQL Editor

-- Step 1: Check current state
DO $$
BEGIN
  RAISE NOTICE 'Checking current stories table schema...';
END $$;

-- Step 2: Drop the incorrect foreign key constraint if it exists
ALTER TABLE public.stories
DROP CONSTRAINT IF EXISTS stories_user_id_fkey;

-- Step 3: Add the correct foreign key constraint referencing profiles(user_id)
ALTER TABLE public.stories
ADD CONSTRAINT stories_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Step 4: Add media_type column for video support
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';

-- Step 5: Add CHECK constraint for media_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stories_media_type_check'
  ) THEN
    ALTER TABLE public.stories
    ADD CONSTRAINT stories_media_type_check
    CHECK (media_type IN ('image', 'video'));
  END IF;
END $$;

-- Step 6: Create index on media_type for filtering
CREATE INDEX IF NOT EXISTS stories_media_type_idx ON public.stories(media_type);

-- Step 7: Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Schema update completed!';
  RAISE NOTICE 'Foreign key now references: profiles(user_id)';
  RAISE NOTICE 'Media types supported: image, video';
END $$;

-- Step 8: Display current constraints for verification
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'stories'
  AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;
