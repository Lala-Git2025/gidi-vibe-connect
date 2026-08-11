-- =====================================================
-- venue_analytics tracking pipeline.
--
-- The table existed but nothing wrote to it — the analytics page silently
-- showed zeros for every Premium business owner. This migration adds:
--
--   1. UNIQUE (venue_id, date) so per-day rows can be upserted atomically.
--   2. track_venue_event(venue_id, event_type) RPC that increments the
--      right counter column for today's row in one statement. SECURITY
--      DEFINER so the consumer app's anon/auth role can call it without
--      needing direct INSERT permission on venue_analytics.
--   3. Validation: event_type must be one of the known columns; invalid
--      input raises (so a typo on the client surfaces in dev).
-- =====================================================

-- Idempotency: only add the constraint if it isn't already there.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.venue_analytics'::regclass
      AND conname = 'venue_analytics_venue_id_date_key'
  ) THEN
    ALTER TABLE public.venue_analytics
      ADD CONSTRAINT venue_analytics_venue_id_date_key
      UNIQUE (venue_id, date);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.track_venue_event(
  p_venue_id UUID,
  p_event_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_type NOT IN (
    'profile_views',
    'phone_clicks',
    'website_clicks',
    'direction_clicks',
    'offer_views',
    'offer_clicks',
    'event_views'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type: %', p_event_type;
  END IF;

  -- Verify the venue exists (cheap, prevents accidental row creation for
  -- garbage IDs and keeps the FK happy).
  IF NOT EXISTS (SELECT 1 FROM public.venues WHERE id = p_venue_id) THEN
    RETURN;
  END IF;

  -- Dynamic SQL because the column name comes from p_event_type. Safe
  -- because we validated the enum-like set above.
  EXECUTE format(
    'INSERT INTO public.venue_analytics (venue_id, date, %1$I)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (venue_id, date)
     DO UPDATE SET %1$I = COALESCE(venue_analytics.%1$I, 0) + 1,
                   updated_at = NOW()',
    p_event_type
  ) USING p_venue_id;
END;
$$;

-- Allow both anonymous (guest mode) and authenticated users to log
-- engagement. SECURITY DEFINER lets the function run with elevated rights
-- without exposing direct table access.
GRANT EXECUTE ON FUNCTION public.track_venue_event(UUID, TEXT) TO anon, authenticated;
