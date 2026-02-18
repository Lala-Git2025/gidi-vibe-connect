-- Check for users without profiles and create them
-- Run this in Supabase SQL Editor

-- First, let's see which users are missing profiles
SELECT
  au.id as auth_user_id,
  au.email,
  p.id as profile_id,
  p.user_id as profile_user_id
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.id IS NULL;

-- Create profiles for any users that don't have one
INSERT INTO public.profiles (user_id, username, full_name, role)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)),
  'Consumer'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify all users now have profiles
SELECT
  au.id as auth_user_id,
  au.email,
  p.user_id as profile_user_id,
  p.username,
  CASE
    WHEN p.id IS NOT NULL THEN '✅ Profile exists'
    ELSE '❌ No profile'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id;
