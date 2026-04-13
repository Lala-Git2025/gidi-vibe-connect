-- =====================================================
-- Backfill business_profiles and admin_profiles
-- for existing users based on their role in profiles
-- =====================================================

-- Create business_profiles rows for existing Business Owners
INSERT INTO public.business_profiles (user_id)
SELECT user_id FROM public.profiles
WHERE role = 'Business Owner'
ON CONFLICT (user_id) DO NOTHING;

-- Create admin_profiles rows for existing Admins
INSERT INTO public.admin_profiles (user_id, can_manage_users, can_manage_venues, can_manage_promotions, can_manage_content)
SELECT
  user_id,
  false,  -- regular admins don't manage users by default
  true,
  true,
  true
FROM public.profiles
WHERE role = 'Admin'
ON CONFLICT (user_id) DO NOTHING;

-- Create admin_profiles rows for existing Super Admins (all permissions)
INSERT INTO public.admin_profiles (user_id, can_manage_users, can_manage_venues, can_manage_promotions, can_manage_content)
SELECT
  user_id,
  true,
  true,
  true,
  true
FROM public.profiles
WHERE role = 'Super Admin'
ON CONFLICT (user_id) DO NOTHING;
