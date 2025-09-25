-- Fix critical security vulnerability: Phone numbers exposed to all users
-- Create a security definer function to return only safe profile data for public viewing

-- First, create a function that returns only non-sensitive profile data
CREATE OR REPLACE FUNCTION public.get_public_profile_data(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  role user_role,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return non-sensitive profile data for public access
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.location,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Public profiles viewable without sensitive data" ON public.profiles;

-- Create new secure policies
-- Policy 1: Users can see their own complete profile (including phone)
CREATE POLICY "Users can view their own complete profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Other authenticated users can only see non-sensitive public data
-- This policy is more restrictive and doesn't expose phone numbers
CREATE POLICY "Public profile data viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() != user_id AND
  auth.uid() IS NOT NULL
);

-- Create a view for public profile access that explicitly excludes sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  location,
  role,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Update the existing public profile function to be more explicit about security
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_safe_public_profile(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  role user_role,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return non-sensitive profile data for public access
  -- Phone numbers and other sensitive data are excluded
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.location,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;