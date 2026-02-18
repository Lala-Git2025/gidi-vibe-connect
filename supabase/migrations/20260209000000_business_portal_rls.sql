-- Business Portal RLS Policies
-- Enable Row Level Security on business-related tables

-- ============================================
-- BUSINESS SUBSCRIPTIONS POLICIES
-- ============================================

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Business owners can view their subscription" ON public.business_subscriptions;
DROP POLICY IF EXISTS "Business owners can update their subscription" ON public.business_subscriptions;

-- Business owners can view their own subscription
CREATE POLICY "Business owners can view their subscription"
  ON public.business_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Business owners can update their subscription (for payment updates, etc.)
CREATE POLICY "Business owners can update their subscription"
  ON public.business_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION REQUESTS POLICIES
-- ============================================

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Business owners can create verification requests" ON public.verification_requests;

-- Users can view their own verification requests
CREATE POLICY "Users can view their verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Business owners can create verification requests
CREATE POLICY "Business owners can create verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'Business Owner'
    )
  );

-- ============================================
-- VENUE MENUS POLICIES
-- ============================================

ALTER TABLE public.venue_menus ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view active menu items" ON public.venue_menus;
DROP POLICY IF EXISTS "Venue owners can manage their menu" ON public.venue_menus;

-- Public can view active menu items
CREATE POLICY "Public can view active menu items"
  ON public.venue_menus FOR SELECT
  USING (is_available = true);

-- Venue owners can manage their venue menus
CREATE POLICY "Venue owners can manage their menu"
  ON public.venue_menus FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE id = venue_id AND owner_id = auth.uid()
    )
  );

-- ============================================
-- VENUE ANALYTICS POLICIES
-- ============================================

ALTER TABLE public.venue_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Venue owners can view their analytics" ON public.venue_analytics;
DROP POLICY IF EXISTS "System can insert analytics" ON public.venue_analytics;
DROP POLICY IF EXISTS "System can update analytics" ON public.venue_analytics;

-- Venue owners can view their analytics
CREATE POLICY "Venue owners can view their analytics"
  ON public.venue_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE id = venue_id AND owner_id = auth.uid()
    )
  );

-- System can insert analytics (from consumer app tracking)
CREATE POLICY "System can insert analytics"
  ON public.venue_analytics FOR INSERT
  WITH CHECK (true);

-- System can update analytics (for incrementing counts)
CREATE POLICY "System can update analytics"
  ON public.venue_analytics FOR UPDATE
  USING (true);

-- ============================================
-- EXCLUSIVE OFFERS POLICIES (Enhancement)
-- ============================================

-- Ensure venue owners can manage offers for their venues
DROP POLICY IF EXISTS "Venue owners can create offers for their venues" ON public.exclusive_offers;
DROP POLICY IF EXISTS "Venue owners can update their offers" ON public.exclusive_offers;
DROP POLICY IF EXISTS "Venue owners can delete their offers" ON public.exclusive_offers;

CREATE POLICY "Venue owners can create offers for their venues"
  ON public.exclusive_offers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE id = venue_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Venue owners can update their offers"
  ON public.exclusive_offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE id = venue_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Venue owners can delete their offers"
  ON public.exclusive_offers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE id = venue_id AND owner_id = auth.uid()
    )
  );

-- ============================================
-- COMMENT
-- ============================================

COMMENT ON POLICY "Business owners can view their subscription" ON public.business_subscriptions IS
  'Allows business owners to view their subscription tier and limits';

COMMENT ON POLICY "Venue owners can view their analytics" ON public.venue_analytics IS
  'Allows venue owners to access analytics data for their venues';
