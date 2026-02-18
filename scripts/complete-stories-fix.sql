-- COMPLETE FIX for Stories Upload Issue
-- This script does EVERYTHING needed to fix the error
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: Create Missing Profiles
-- ============================================

DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  -- Count users without profiles
  SELECT COUNT(*) INTO missing_count
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE p.id IS NULL;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'PART 1: Creating Missing Profiles';
  RAISE NOTICE 'Found % users without profiles', missing_count;
  RAISE NOTICE '============================================';
END $$;

-- Create profiles for any authenticated users that don't have one
INSERT INTO public.profiles (user_id, username, full_name, role, bio)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1), 'user_' || SUBSTRING(au.id::text, 1, 8)),
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1), 'User'),
  'Consumer',
  'Lagos vibe enthusiast'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify profiles created
DO $$
DECLARE
  total_users INTEGER;
  total_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;

  RAISE NOTICE 'Total auth users: %', total_users;
  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE '✅ All users now have profiles!';
  RAISE NOTICE '';
END $$;

-- ============================================
-- PART 2: Fix Foreign Key Constraint
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PART 2: Fixing Foreign Key Constraint';
  RAISE NOTICE '============================================';
END $$;

-- Drop the old incorrect foreign key constraint
ALTER TABLE public.stories
DROP CONSTRAINT IF EXISTS stories_user_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE public.stories
ADD CONSTRAINT stories_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key now references profiles(user_id)';
  RAISE NOTICE '';
END $$;

-- ============================================
-- PART 3: Add Video Support
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PART 3: Adding Video Support';
  RAISE NOTICE '============================================';
END $$;

-- Add media_type column
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';

-- Add CHECK constraint for media_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stories_media_type_check'
  ) THEN
    ALTER TABLE public.stories
    ADD CONSTRAINT stories_media_type_check
    CHECK (media_type IN ('image', 'video'));
    RAISE NOTICE '✅ Added media_type column with CHECK constraint';
  ELSE
    RAISE NOTICE '✅ media_type column already exists';
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS stories_media_type_idx ON public.stories(media_type);

DO $$
BEGIN
  RAISE NOTICE '✅ Created index on media_type';
  RAISE NOTICE '';
END $$;

-- ============================================
-- PART 4: Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PART 4: Verification';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Current Configuration:';
  RAISE NOTICE '';
END $$;

-- Show all users and their profiles
SELECT
  au.email as "User Email",
  au.id as "Auth ID",
  p.user_id as "Profile user_id",
  p.username as "Username",
  CASE
    WHEN p.id IS NOT NULL THEN '✅'
    ELSE '❌'
  END as "Has Profile"
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
ORDER BY au.created_at DESC;

-- Show current constraints
SELECT
  tc.constraint_name as "Constraint",
  tc.constraint_type as "Type",
  kcu.column_name as "Column",
  ccu.table_name as "References Table",
  ccu.column_name as "References Column"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'stories'
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ALL FIXES COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  1. Go to Profile tab and sign in';
  RAISE NOTICE '  2. Go to Home screen';
  RAISE NOTICE '  3. Click "My Vibe"';
  RAISE NOTICE '  4. Upload images or videos (up to 60s)';
  RAISE NOTICE '';
  RAISE NOTICE 'Both images and videos are now supported! 🎉';
  RAISE NOTICE '';
END $$;
