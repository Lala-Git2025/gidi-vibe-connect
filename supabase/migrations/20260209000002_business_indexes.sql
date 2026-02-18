-- Business Portal Performance Indexes
-- Indexes to optimize queries for business portal features

-- ============================================
-- BUSINESS SUBSCRIPTIONS INDEXES
-- ============================================

-- Index for quick subscription lookups by user and status
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_user_id_status
  ON public.business_subscriptions(user_id, status);

-- Index for subscription expiration checks
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_period_end
  ON public.business_subscriptions(current_period_end)
  WHERE status = 'active';

-- Index for trial expiration checks
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_trial_ends
  ON public.business_subscriptions(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- ============================================
-- VENUE ANALYTICS INDEXES
-- ============================================

-- Index for analytics queries by venue and date range (most common query)
CREATE INDEX IF NOT EXISTS idx_venue_analytics_venue_date
  ON public.venue_analytics(venue_id, date DESC);

-- Index for time-series queries (last 30 days, last 7 days, etc.)
CREATE INDEX IF NOT EXISTS idx_venue_analytics_date
  ON public.venue_analytics(date DESC);

-- Composite index for owner analytics (via venues join)
CREATE INDEX IF NOT EXISTS idx_venues_owner_id_id
  ON public.venues(owner_id, id);

-- ============================================
-- VENUE MENUS INDEXES
-- ============================================

-- Index for menu items by venue and category
CREATE INDEX IF NOT EXISTS idx_venue_menus_venue_category
  ON public.venue_menus(venue_id, category);

-- Index for available menu items (public display)
CREATE INDEX IF NOT EXISTS idx_venue_menus_venue_available
  ON public.venue_menus(venue_id, is_available)
  WHERE is_available = true;

-- Index for menu display order
CREATE INDEX IF NOT EXISTS idx_venue_menus_display_order
  ON public.venue_menus(venue_id, display_order);

-- ============================================
-- EXCLUSIVE OFFERS INDEXES
-- ============================================

-- Index for active offers by venue
CREATE INDEX IF NOT EXISTS idx_exclusive_offers_venue_active
  ON public.exclusive_offers(venue_id, is_active)
  WHERE is_active = true;

-- Index for offer expiration checks
CREATE INDEX IF NOT EXISTS idx_exclusive_offers_end_date
  ON public.exclusive_offers(end_date, is_active)
  WHERE is_active = true;

-- Index for offer redemption tracking
CREATE INDEX IF NOT EXISTS idx_exclusive_offers_redemptions
  ON public.exclusive_offers(venue_id, current_redemptions, max_redemptions)
  WHERE is_active = true;

-- ============================================
-- VERIFICATION REQUESTS INDEXES
-- ============================================

-- Index for user verification status lookup
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_status
  ON public.verification_requests(user_id, status);

-- Index for admin review queue (pending verifications)
CREATE INDEX IF NOT EXISTS idx_verification_requests_status_created
  ON public.verification_requests(status, created_at DESC)
  WHERE status = 'pending';

-- ============================================
-- EVENTS INDEXES (for business dashboard)
-- ============================================

-- Note: Events table currently doesn't have venue_id foreign key
-- These indexes will be added when events schema is updated to link to venues

-- Index for upcoming events by start date
CREATE INDEX IF NOT EXISTS idx_events_start_date
  ON public.events(start_date DESC);

-- Index for events by category
CREATE INDEX IF NOT EXISTS idx_events_category
  ON public.events(category, start_date DESC);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON INDEX idx_business_subscriptions_user_id_status IS
  'Optimizes subscription lookups for business owners';

COMMENT ON INDEX idx_venue_analytics_venue_date IS
  'Optimizes analytics queries for date range filtering';

COMMENT ON INDEX idx_venue_menus_venue_category IS
  'Optimizes menu item queries by category';

COMMENT ON INDEX idx_exclusive_offers_venue_active IS
  'Optimizes active offers lookup for venue profiles';

COMMENT ON INDEX idx_verification_requests_status_created IS
  'Optimizes admin review queue for pending verifications';
