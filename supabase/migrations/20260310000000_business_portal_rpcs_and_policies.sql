-- =====================================================
-- Business Portal: RPC functions + storage policies
-- =====================================================

-- ── venue-photos storage bucket ───────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-photos',
  'venue-photos',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Venue photos public read'
  ) THEN
    CREATE POLICY "Venue photos public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'venue-photos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Venue photos authenticated upload'
  ) THEN
    CREATE POLICY "Venue photos authenticated upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'venue-photos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Venue photos authenticated delete'
  ) THEN
    CREATE POLICY "Venue photos authenticated delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'venue-photos');
  END IF;
END $$;

-- ── business_subscriptions table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'Free',
  max_venues INTEGER NOT NULL DEFAULT 1,
  max_events_per_month INTEGER NOT NULL DEFAULT 5,
  max_photos_per_venue INTEGER NOT NULL DEFAULT 5,
  can_view_analytics BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'business_subscriptions'
      AND policyname = 'Users can view own subscription'
  ) THEN
    CREATE POLICY "Users can view own subscription"
      ON public.business_subscriptions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'business_subscriptions'
      AND policyname = 'Users can insert own subscription'
  ) THEN
    CREATE POLICY "Users can insert own subscription"
      ON public.business_subscriptions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'business_subscriptions'
      AND policyname = 'Users can update own subscription'
  ) THEN
    CREATE POLICY "Users can update own subscription"
      ON public.business_subscriptions FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── verification_requests table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'verification_requests'
      AND policyname = 'Users can view own verification'
  ) THEN
    CREATE POLICY "Users can view own verification"
      ON public.verification_requests FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'verification_requests'
      AND policyname = 'Users can insert own verification'
  ) THEN
    CREATE POLICY "Users can insert own verification"
      ON public.verification_requests FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── venue_analytics table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.venue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  profile_views INTEGER NOT NULL DEFAULT 0,
  phone_clicks INTEGER NOT NULL DEFAULT 0,
  website_clicks INTEGER NOT NULL DEFAULT 0,
  direction_clicks INTEGER NOT NULL DEFAULT 0,
  offer_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, date)
);

ALTER TABLE public.venue_analytics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venue_analytics'
      AND policyname = 'Venue owners can view their analytics'
  ) THEN
    CREATE POLICY "Venue owners can view their analytics"
      ON public.venue_analytics FOR SELECT
      USING (
        venue_id IN (
          SELECT id FROM public.venues WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── RPC: check_venue_creation_limit ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_venue_creation_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_venues INTEGER;
  v_current_venues INTEGER;
BEGIN
  -- Get subscription limit (default 1 for free tier)
  SELECT COALESCE(max_venues, 1)
  INTO v_max_venues
  FROM public.business_subscriptions
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  -- Default to 1 if no subscription found
  IF v_max_venues IS NULL THEN
    v_max_venues := 1;
  END IF;

  -- Count current venues
  SELECT COUNT(*)
  INTO v_current_venues
  FROM public.venues
  WHERE owner_id = p_user_id;

  RETURN v_current_venues < v_max_venues;
END;
$$;

-- ── RPC: check_event_creation_limit ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_event_creation_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_events INTEGER;
  v_current_events INTEGER;
  v_month_start TIMESTAMPTZ;
BEGIN
  v_month_start := date_trunc('month', now());

  -- Get subscription limit (default 5 for free tier)
  SELECT COALESCE(max_events_per_month, 5)
  INTO v_max_events
  FROM public.business_subscriptions
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF v_max_events IS NULL THEN
    v_max_events := 5;
  END IF;

  -- Count events created this calendar month
  SELECT COUNT(*)
  INTO v_current_events
  FROM public.events
  WHERE organizer_id = p_user_id
    AND created_at >= v_month_start;

  RETURN v_current_events < v_max_events;
END;
$$;

-- ── Ensure business portal events appear in consumer app ─────────────────────
-- Consumer app filters by is_active = true.
-- Create a trigger that auto-sets is_active when is_published = true.

CREATE OR REPLACE FUNCTION public.sync_event_active_from_published()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a business publishes an event, make it active in consumer app
  IF NEW.is_published = true AND (OLD.is_published IS DISTINCT FROM true) THEN
    NEW.is_active := true;
    NEW.source := COALESCE(NEW.source, 'manual');
  END IF;
  -- When unpublished, hide from consumer app
  IF NEW.is_published = false AND OLD.is_published = true THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_event_active ON public.events;
CREATE TRIGGER trg_sync_event_active
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_active_from_published();

-- Also handle INSERT: if published on creation, make active immediately
CREATE OR REPLACE FUNCTION public.sync_event_active_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_published = true THEN
    NEW.is_active := true;
    NEW.source := COALESCE(NEW.source, 'manual');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_event_active_insert ON public.events;
CREATE TRIGGER trg_sync_event_active_insert
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_active_on_insert();

-- ── RLS: Business owners manage their own venues ──────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venues'
      AND policyname = 'Business owners can insert venues'
  ) THEN
    CREATE POLICY "Business owners can insert venues"
      ON public.venues FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venues'
      AND policyname = 'Business owners can update own venues'
  ) THEN
    CREATE POLICY "Business owners can update own venues"
      ON public.venues FOR UPDATE
      TO authenticated
      USING (auth.uid() = owner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venues'
      AND policyname = 'Business owners can delete own venues'
  ) THEN
    CREATE POLICY "Business owners can delete own venues"
      ON public.venues FOR DELETE
      TO authenticated
      USING (auth.uid() = owner_id);
  END IF;
END $$;

-- ── RLS: Business owners manage their own events ──────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events'
      AND policyname = 'Business owners can insert events'
  ) THEN
    CREATE POLICY "Business owners can insert events"
      ON public.events FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = organizer_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events'
      AND policyname = 'Business owners can update own events'
  ) THEN
    CREATE POLICY "Business owners can update own events"
      ON public.events FOR UPDATE
      TO authenticated
      USING (auth.uid() = organizer_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events'
      AND policyname = 'Business owners can delete own events'
  ) THEN
    CREATE POLICY "Business owners can delete own events"
      ON public.events FOR DELETE
      TO authenticated
      USING (auth.uid() = organizer_id);
  END IF;
END $$;
