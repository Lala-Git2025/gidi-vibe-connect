-- =====================================================
-- Business Profiles & Admin Profiles
-- Extension tables for role-specific data.
-- The base `profiles` table remains the source of truth
-- for shared fields (name, username, avatar, role).
-- =====================================================

-- ── business_profiles ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT,
  business_email TEXT,
  business_phone TEXT,
  business_address TEXT,
  business_description TEXT,
  website_url TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Business owners can view their own profile
CREATE POLICY "Business owners can view own business profile"
  ON public.business_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Business owners can insert their own profile
CREATE POLICY "Business owners can insert own business profile"
  ON public.business_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'Business Owner'
    )
  );

-- Business owners can update their own profile
CREATE POLICY "Business owners can update own business profile"
  ON public.business_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all business profiles
CREATE POLICY "Admins can view all business profiles"
  ON public.business_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Super Admin')
    )
  );

-- Admins can update all business profiles (e.g. verify)
CREATE POLICY "Admins can update all business profiles"
  ON public.business_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Super Admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id
  ON public.business_profiles(user_id);

-- ── admin_profiles ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  department TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  assigned_areas TEXT[] NOT NULL DEFAULT '{}',
  can_manage_users BOOLEAN NOT NULL DEFAULT false,
  can_manage_venues BOOLEAN NOT NULL DEFAULT false,
  can_manage_promotions BOOLEAN NOT NULL DEFAULT false,
  can_manage_content BOOLEAN NOT NULL DEFAULT false,
  last_active_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can view their own profile
CREATE POLICY "Admins can view own admin profile"
  ON public.admin_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can update their own profile
CREATE POLICY "Admins can update own admin profile"
  ON public.admin_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Super Admins can view all admin profiles
CREATE POLICY "Super Admins can view all admin profiles"
  ON public.admin_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'Super Admin'
    )
  );

-- Super Admins can insert admin profiles (when promoting users)
CREATE POLICY "Super Admins can insert admin profiles"
  ON public.admin_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'Super Admin'
    )
  );

-- Super Admins can update all admin profiles
CREATE POLICY "Super Admins can update all admin profiles"
  ON public.admin_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'Super Admin'
    )
  );

-- Super Admins can delete admin profiles (when demoting users)
CREATE POLICY "Super Admins can delete admin profiles"
  ON public.admin_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'Super Admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_profiles_user_id
  ON public.admin_profiles(user_id);

-- ── Auto-create business_profile when role changes to Business Owner ─────────

CREATE OR REPLACE FUNCTION public.handle_business_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a user becomes a Business Owner, create a business_profiles row
  IF NEW.role = 'Business Owner' AND (OLD.role IS DISTINCT FROM 'Business Owner') THEN
    INSERT INTO public.business_profiles (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- When a user becomes Admin or Super Admin, create an admin_profiles row
  IF NEW.role IN ('Admin', 'Super Admin') AND OLD.role NOT IN ('Admin', 'Super Admin') THEN
    INSERT INTO public.admin_profiles (user_id, can_manage_users, can_manage_venues, can_manage_promotions, can_manage_content)
    VALUES (
      NEW.user_id,
      NEW.role = 'Super Admin',  -- Super Admins get all permissions by default
      true,
      true,
      true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_business_role_assignment ON public.profiles;
CREATE TRIGGER trg_handle_business_role_assignment
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_business_role_assignment();

-- ── updated_at triggers ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_profiles_updated_at ON public.admin_profiles;
CREATE TRIGGER trg_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
