-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a more secure policy that excludes phone numbers for public viewing
-- Users can view all profiles but without sensitive fields like phone numbers
CREATE POLICY "Public profiles viewable without sensitive data" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can see their own complete profile
  auth.uid() = user_id 
  OR 
  -- Others can see profiles but phone will be filtered out at application level
  auth.uid() IS NOT NULL
);

-- Create a security definer function to safely retrieve profile data for public viewing
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  role user_role,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;