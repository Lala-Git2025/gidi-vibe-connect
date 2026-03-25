-- =====================================================
-- Fix Events Table for Business Portal Integration
-- Adds organizer_id, is_published, and portal-specific
-- columns so businesses can post their own events.
-- Also creates event-images bucket and fixes RLS.
-- =====================================================

-- 1. Add organizer_id (links event to a business owner user)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);

-- 2. Add is_published flag (drafts vs live for manually-created events)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- 3. Business portal uses featured_image_url (uploaded to event-images bucket)
--    Consumer app uses image_url (from external sources).
--    Both are stored so EventsScreen can fall back between them.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

-- 4. Human-readable price string from business portal
--    e.g. "Free", "₦5,000", "₦5,000 - ₦10,000"
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS price_info TEXT;

-- 5. Ticket / registration URL from business portal
--    (existing ticket_url is used for scraped events)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_url TEXT;

-- ─── event-images storage bucket ────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Authenticated users can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-images'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Event images are publicly readable" ON storage.objects;
CREATE POLICY "Event images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Users can update their own event images" ON storage.objects;
CREATE POLICY "Users can update their own event images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own event images" ON storage.objects;
CREATE POLICY "Users can delete their own event images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Fix RLS policies ────────────────────────────────────────────────────────

-- Drop old policies so we can replace them cleanly
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;

-- Public can see:
--   • all active events from external sources (Eventbrite, scraped, etc.)
--   • manually-created events only once published
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (
    is_active = true
    AND (source != 'manual' OR is_published = true)
  );

-- Authenticated users can insert events (organizer_id must match caller)
CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (organizer_id IS NULL OR organizer_id = auth.uid())
  );

-- Business owners can update their own events
DROP POLICY IF EXISTS "Organizers can update their own events" ON public.events;
CREATE POLICY "Organizers can update their own events"
  ON public.events FOR UPDATE
  USING (organizer_id = auth.uid());

-- Business owners can delete their own events
DROP POLICY IF EXISTS "Organizers can delete their own events" ON public.events;
CREATE POLICY "Organizers can delete their own events"
  ON public.events FOR DELETE
  USING (organizer_id = auth.uid());

-- ─── check_event_creation_limit RPC ─────────────────────────────────────────
-- Returns true if the user can still create an event this month.
-- Limits: Free = 5, Premium = 20, Enterprise = unlimited (9999).

CREATE OR REPLACE FUNCTION public.check_event_creation_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_events_this_month INTEGER;
  v_tier TEXT;
  v_max_events INTEGER;
BEGIN
  -- Get the user's subscription tier
  SELECT COALESCE(tier, 'Free')
  INTO v_tier
  FROM public.business_subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Map tier to limit
  v_max_events := CASE v_tier
    WHEN 'Enterprise' THEN 9999
    WHEN 'Premium'    THEN 20
    ELSE 5  -- Free plan
  END;

  -- Count events created by this user in the current calendar month
  SELECT COUNT(*)
  INTO v_events_this_month
  FROM public.events
  WHERE organizer_id = p_user_id
    AND created_at >= date_trunc('month', NOW());

  RETURN v_events_this_month < v_max_events;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_event_creation_limit(UUID) TO authenticated;

-- ─── Mark existing manual events as published ────────────────────────────────
-- Any events already in the DB with source='manual' were added by admins
-- and should remain visible after the policy change.
UPDATE public.events
SET is_published = true
WHERE source = 'manual';

-- =====================================================
-- Migration complete.
-- Run this in Supabase SQL Editor to enable business
-- portal event posting.
-- =====================================================
