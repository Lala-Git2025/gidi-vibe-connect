-- =====================================================
-- Admin RLS bypass policies for venues table
-- Allows Admin and Super Admin roles to SELECT/UPDATE all venues
-- =====================================================

-- Drop existing restrictive policies that block admins
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venues'
      AND policyname = 'Business owners can update own venues'
  ) THEN
    DROP POLICY "Business owners can update own venues" ON public.venues;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venues'
      AND policyname = 'Business owners can view own venues'
  ) THEN
    DROP POLICY "Business owners can view own venues" ON public.venues;
  END IF;
END $$;

-- SELECT: owners see their own venues, admins see all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venues'
      AND policyname = 'Owners and admins can view venues'
  ) THEN
    CREATE POLICY "Owners and admins can view venues"
      ON public.venues FOR SELECT
      TO authenticated
      USING (
        owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid()
            AND role IN ('Admin', 'Super Admin')
        )
      );
  END IF;
END $$;

-- UPDATE: owners update their own venues, admins update any venue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venues'
      AND policyname = 'Owners and admins can update venues'
  ) THEN
    CREATE POLICY "Owners and admins can update venues"
      ON public.venues FOR UPDATE
      TO authenticated
      USING (
        owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid()
            AND role IN ('Admin', 'Super Admin')
        )
      );
  END IF;
END $$;
