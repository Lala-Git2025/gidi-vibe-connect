-- =====================================================
-- Fix 1: Allow authenticated users to read all profiles
-- (Required for Social feed to show author names)
-- =====================================================

DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Also allow anon reads so guest mode can see posts
DROP POLICY IF EXISTS "Public profiles are readable by anyone" ON public.profiles;
CREATE POLICY "Public profiles are readable by anyone"
ON public.profiles FOR SELECT
TO anon
USING (true);

-- =====================================================
-- Fix 2: Create badge_definitions as alias / ensure
-- user_badges FK works whether table is 'badges' or
-- 'badge_definitions' in this Supabase instance.
-- If badge_definitions exists, create a view called
-- badges pointing to it so the app query works.
-- =====================================================

DO $$
BEGIN
  -- Only create the view if badge_definitions exists but badges doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'badge_definitions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'badges'
  ) THEN
    EXECUTE 'CREATE VIEW public.badges AS SELECT * FROM public.badge_definitions';
  END IF;
END
$$;
