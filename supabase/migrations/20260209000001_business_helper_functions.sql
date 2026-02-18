-- Business Portal Helper Functions
-- Functions to enforce subscription limits and track analytics

-- ============================================
-- CHECK VENUE CREATION LIMIT
-- ============================================

CREATE OR REPLACE FUNCTION check_venue_creation_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
  v_max_venues INTEGER;
  v_subscription_status TEXT;
BEGIN
  -- Get current venue count for user
  SELECT COUNT(*) INTO v_current_count
  FROM public.venues
  WHERE owner_id = p_user_id;

  -- Get subscription limit and status
  SELECT max_venues, status INTO v_max_venues, v_subscription_status
  FROM public.business_subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no subscription found, return false
  IF v_max_venues IS NULL THEN
    RETURN false;
  END IF;

  -- If subscription is not active, return false
  IF v_subscription_status != 'active' THEN
    RETURN false;
  END IF;

  -- Check if current count is less than max allowed
  RETURN v_current_count < v_max_venues;
END;
$$;

COMMENT ON FUNCTION check_venue_creation_limit(UUID) IS
  'Checks if a business owner can create another venue based on their subscription tier';

-- ============================================
-- CHECK EVENT CREATION LIMIT (MONTHLY)
-- ============================================

CREATE OR REPLACE FUNCTION check_event_creation_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
  v_max_events INTEGER;
  v_subscription_status TEXT;
BEGIN
  -- Get current month's event count for user's venues
  SELECT COUNT(*) INTO v_current_count
  FROM public.events e
  INNER JOIN public.venues v ON e.venue_id = v.id
  WHERE v.owner_id = p_user_id
    AND EXTRACT(YEAR FROM e.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM e.created_at) = EXTRACT(MONTH FROM CURRENT_DATE);

  -- Get subscription limit
  SELECT max_events_per_month, status INTO v_max_events, v_subscription_status
  FROM public.business_subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no subscription found, return false
  IF v_max_events IS NULL THEN
    RETURN false;
  END IF;

  -- If subscription is not active, return false
  IF v_subscription_status != 'active' THEN
    RETURN false;
  END IF;

  -- Check if current count is less than max allowed
  RETURN v_current_count < v_max_events;
END;
$$;

COMMENT ON FUNCTION check_event_creation_limit(UUID) IS
  'Checks if a business owner can create another event this month based on their subscription tier';

-- ============================================
-- CHECK PHOTO UPLOAD LIMIT
-- ============================================

CREATE OR REPLACE FUNCTION check_photo_upload_limit(p_user_id UUID, p_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_photo_count INTEGER;
  v_max_photos INTEGER;
  v_subscription_status TEXT;
BEGIN
  -- Get current photo count for venue
  SELECT COALESCE(array_length(professional_media_urls, 1), 0) INTO v_current_photo_count
  FROM public.venues
  WHERE id = p_venue_id AND owner_id = p_user_id;

  -- Get subscription photo limit
  SELECT max_photos_per_venue, status INTO v_max_photos, v_subscription_status
  FROM public.business_subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no subscription found, return false
  IF v_max_photos IS NULL THEN
    RETURN false;
  END IF;

  -- If subscription is not active, return false
  IF v_subscription_status != 'active' THEN
    RETURN false;
  END IF;

  -- Check if current count is less than max allowed
  RETURN v_current_photo_count < v_max_photos;
END;
$$;

COMMENT ON FUNCTION check_photo_upload_limit(UUID, UUID) IS
  'Checks if a business owner can upload another photo to a venue based on their subscription tier';

-- ============================================
-- RECORD VENUE VIEW (ANALYTICS TRACKING)
-- ============================================

CREATE OR REPLACE FUNCTION record_venue_view(p_venue_id UUID, p_view_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update analytics for today
  INSERT INTO public.venue_analytics (
    venue_id,
    date,
    profile_views,
    phone_clicks,
    direction_clicks,
    website_clicks,
    offer_views,
    offer_clicks,
    event_views
  ) VALUES (
    p_venue_id,
    CURRENT_DATE,
    CASE WHEN p_view_type = 'profile' THEN 1 ELSE 0 END,
    CASE WHEN p_view_type = 'phone' THEN 1 ELSE 0 END,
    CASE WHEN p_view_type = 'directions' THEN 1 ELSE 0 END,
    CASE WHEN p_view_type = 'website' THEN 1 ELSE 0 END,
    CASE WHEN p_view_type = 'offer_view' THEN 1 ELSE 0 END,
    CASE WHEN p_view_type = 'offer_click' THEN 1 ELSE 0 END,
    CASE WHEN p_view_type = 'event' THEN 1 ELSE 0 END
  )
  ON CONFLICT (venue_id, date)
  DO UPDATE SET
    profile_views = venue_analytics.profile_views + EXCLUDED.profile_views,
    phone_clicks = venue_analytics.phone_clicks + EXCLUDED.phone_clicks,
    direction_clicks = venue_analytics.direction_clicks + EXCLUDED.direction_clicks,
    website_clicks = venue_analytics.website_clicks + EXCLUDED.website_clicks,
    offer_views = venue_analytics.offer_views + EXCLUDED.offer_views,
    offer_clicks = venue_analytics.offer_clicks + EXCLUDED.offer_clicks,
    event_views = venue_analytics.event_views + EXCLUDED.event_views,
    updated_at = CURRENT_TIMESTAMP;
END;
$$;

COMMENT ON FUNCTION record_venue_view(UUID, TEXT) IS
  'Records analytics events from the consumer app. Called when users interact with venues.';

-- ============================================
-- GET USER SUBSCRIPTION STATUS
-- ============================================

CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id UUID)
RETURNS TABLE (
  tier TEXT,
  status TEXT,
  max_venues INTEGER,
  max_photos_per_venue INTEGER,
  max_events_per_month INTEGER,
  can_view_analytics BOOLEAN,
  can_create_offers BOOLEAN,
  can_manage_menu BOOLEAN,
  priority_listing BOOLEAN,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bs.tier::TEXT,
    bs.status,
    bs.max_venues,
    bs.max_photos_per_venue,
    bs.max_events_per_month,
    bs.can_view_analytics,
    bs.can_create_offers,
    bs.can_manage_menu,
    bs.priority_listing,
    bs.trial_ends_at,
    bs.current_period_end
  FROM public.business_subscriptions bs
  WHERE bs.user_id = p_user_id
  ORDER BY bs.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_user_subscription_status(UUID) IS
  'Returns the current subscription status and feature access for a business owner';

-- ============================================
-- GET VENUE ANALYTICS SUMMARY
-- ============================================

CREATE OR REPLACE FUNCTION get_venue_analytics_summary(
  p_user_id UUID,
  p_venue_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  venue_id UUID,
  venue_name TEXT,
  total_profile_views BIGINT,
  total_phone_clicks BIGINT,
  total_direction_clicks BIGINT,
  total_website_clicks BIGINT,
  total_offer_views BIGINT,
  total_offer_clicks BIGINT,
  total_event_views BIGINT,
  total_engagement BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS venue_id,
    v.name AS venue_name,
    COALESCE(SUM(va.profile_views), 0) AS total_profile_views,
    COALESCE(SUM(va.phone_clicks), 0) AS total_phone_clicks,
    COALESCE(SUM(va.direction_clicks), 0) AS total_direction_clicks,
    COALESCE(SUM(va.website_clicks), 0) AS total_website_clicks,
    COALESCE(SUM(va.offer_views), 0) AS total_offer_views,
    COALESCE(SUM(va.offer_clicks), 0) AS total_offer_clicks,
    COALESCE(SUM(va.event_views), 0) AS total_event_views,
    COALESCE(SUM(
      va.phone_clicks +
      va.direction_clicks +
      va.website_clicks +
      va.offer_clicks
    ), 0) AS total_engagement
  FROM public.venues v
  LEFT JOIN public.venue_analytics va
    ON v.id = va.venue_id
    AND va.date BETWEEN p_start_date AND p_end_date
  WHERE v.owner_id = p_user_id
    AND (p_venue_id IS NULL OR v.id = p_venue_id)
  GROUP BY v.id, v.name
  ORDER BY total_profile_views DESC;
END;
$$;

COMMENT ON FUNCTION get_venue_analytics_summary(UUID, UUID, DATE, DATE) IS
  'Returns aggregated analytics data for a business owner''s venues within a date range';
