-- =====================================================
-- Fix existing profiles that have empty full_name
-- Copies name from auth.users metadata, or uses email prefix
-- =====================================================

UPDATE public.profiles p
SET full_name = (
  SELECT COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(u.email, '@', 1),
    'User'
  )
  FROM auth.users u
  WHERE u.id = p.user_id
)
WHERE p.full_name IS NULL OR TRIM(p.full_name) = '';

-- =====================================================
-- Ensure every auth user has a profile row
-- (handles users who pre-date the handle_new_user trigger)
-- =====================================================

INSERT INTO public.profiles (user_id, full_name, role)
SELECT
  u.id,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(u.email, '@', 1),
    'User'
  ),
  'Consumer'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
