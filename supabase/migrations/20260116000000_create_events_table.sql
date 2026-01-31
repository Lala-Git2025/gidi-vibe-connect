-- =====================================================
-- Events Table Migration
-- Unified schema for events from multiple sources
-- =====================================================

-- Create enum for event sources (drop if exists to avoid conflicts)
DROP TYPE IF EXISTS public.event_source CASCADE;
CREATE TYPE public.event_source AS ENUM ('eventbrite', 'nairabox', 'tix_africa', 'manual', 'scraped');

-- Create enum for event status (drop if exists to avoid conflicts)
DROP TYPE IF EXISTS public.event_status CASCADE;
CREATE TYPE public.event_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');

-- Drop existing tables if they exist (for clean re-runs)
DROP TABLE IF EXISTS public.event_saves CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;

-- Create events table
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Basic event info
  title text NOT NULL,
  description text,
  short_description text,

  -- Event details
  category text,
  tags text[],
  event_type text, -- concert, festival, club night, sports, art, etc.

  -- Timing
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  timezone text DEFAULT 'Africa/Lagos',

  -- Location
  venue_name text,
  venue_address text,
  location text NOT NULL DEFAULT 'Lagos, Nigeria',
  latitude decimal(10, 8),
  longitude decimal(11, 8),

  -- Ticketing
  is_free boolean DEFAULT false,
  ticket_price_min decimal(10, 2),
  ticket_price_max decimal(10, 2),
  currency text DEFAULT 'NGN',
  ticket_url text,
  tickets_available integer,

  -- Media
  image_url text,
  banner_url text,
  gallery_urls text[],

  -- Organizer info
  organizer_name text,
  organizer_description text,
  organizer_url text,
  contact_email text,
  contact_phone text,

  -- Social & engagement
  website_url text,
  facebook_url text,
  instagram_url text,
  twitter_url text,
  views_count integer DEFAULT 0,
  saves_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,

  -- Source tracking
  source event_source NOT NULL DEFAULT 'manual',
  external_id text, -- ID from source platform
  external_url text, -- Link to event on source platform

  -- Status & moderation
  status event_status DEFAULT 'upcoming',
  is_featured boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,

  -- Ensure unique external events
  UNIQUE(source, external_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events(location);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_source ON public.events(source);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON public.events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events(is_featured);
CREATE INDEX IF NOT EXISTS idx_events_external_id ON public.events(external_id);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_events_search ON public.events USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Events are viewable by everyone" ON public.events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create events" ON public.events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own events" ON public.events
  FOR UPDATE USING (true); -- Will be restricted by application logic

-- Create event_saves table (users saving events)
CREATE TABLE public.event_saves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_saves_event_id ON public.event_saves(event_id);
CREATE INDEX IF NOT EXISTS idx_event_saves_user_id ON public.event_saves(user_id);

-- Enable RLS on event_saves
ALTER TABLE public.event_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saves" ON public.event_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save events" ON public.event_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave events" ON public.event_saves
  FOR DELETE USING (auth.uid() = user_id);

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.events IS 'Unified events table aggregating from multiple sources (Eventbrite, Nigerian platforms, manual entry)';
COMMENT ON COLUMN public.events.source IS 'Platform or method used to add this event';
COMMENT ON COLUMN public.events.external_id IS 'Unique ID from the source platform';
COMMENT ON COLUMN public.events.last_synced_at IS 'Last time this event was updated from external source';

-- =====================================================
-- Migration complete
-- Ready to sync events from multiple platforms
-- =====================================================
