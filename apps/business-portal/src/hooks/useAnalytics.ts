import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';

export interface VenueAnalytics {
  id: string;
  venue_id: string;
  date: string;
  profile_views: number;
  phone_clicks: number;
  website_clicks: number;
  direction_clicks: number;
  offer_views: number;
  offer_clicks: number;
  event_views: number;
  created_at: string;
}

export interface AnalyticsWithVenue extends VenueAnalytics {
  venue_name: string;
  venue_location: string;
}

export interface AggregatedAnalytics {
  totalProfileViews: number;
  totalPhoneClicks: number;
  totalWebsiteClicks: number;
  totalDirectionClicks: number;
  totalOfferViews: number;
  totalOfferClicks: number;
  totalEventViews: number;
  totalEngagement: number;
  dailyData: Array<{
    date: string;
    profile_views: number;
    phone_clicks: number;
    website_clicks: number;
    direction_clicks: number;
    engagement: number;
  }>;
  venueBreakdown: Array<{
    venue_id: string;
    venue_name: string;
    profile_views: number;
    total_engagement: number;
  }>;
}

export interface DateRange {
  start: string;
  end: string;
}

/**
 * Get default date range (last 30 days)
 */
export function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Hook to fetch analytics data for user's venues
 */
export function useAnalytics(dateRange?: DateRange) {
  const { user, subscription } = useBusinessAuth();
  const range = dateRange || getDefaultDateRange();

  return useQuery({
    queryKey: ['analytics', user?.id, range.start, range.end],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Check if user has analytics access
      if (!subscription?.can_view_analytics) {
        throw new Error('Analytics access requires Premium subscription');
      }

      // First, get all venue IDs owned by this user
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, location')
        .eq('owner_id', user.id);

      if (venuesError) throw venuesError;

      if (!venues || venues.length === 0) {
        // No venues, return empty analytics
        return {
          totalProfileViews: 0,
          totalPhoneClicks: 0,
          totalWebsiteClicks: 0,
          totalDirectionClicks: 0,
          totalOfferViews: 0,
          totalOfferClicks: 0,
          totalEventViews: 0,
          totalEngagement: 0,
          dailyData: [],
          venueBreakdown: [],
        } as AggregatedAnalytics;
      }

      const venueIds = venues.map((v) => v.id);

      // Fetch analytics for these venues within the date range
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('venue_analytics')
        .select('*')
        .in('venue_id', venueIds)
        .gte('date', range.start)
        .lte('date', range.end)
        .order('date', { ascending: true });

      if (analyticsError) throw analyticsError;

      // Aggregate the data
      const aggregated = aggregateAnalytics(analyticsData || [], venues);
      return aggregated;
    },
    enabled: !!user && !!subscription?.can_view_analytics,
  });
}

/**
 * Hook to fetch analytics for a specific venue
 */
export function useVenueAnalytics(venueId: string, dateRange?: DateRange) {
  const { user, subscription } = useBusinessAuth();
  const range = dateRange || getDefaultDateRange();

  return useQuery({
    queryKey: ['venue-analytics', venueId, range.start, range.end],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      if (!subscription?.can_view_analytics) {
        throw new Error('Analytics access requires Premium subscription');
      }

      // Verify user owns this venue
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('id, name, location')
        .eq('id', venueId)
        .eq('owner_id', user.id)
        .single();

      if (venueError) throw venueError;

      // Fetch analytics for this venue
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('venue_analytics')
        .select('*')
        .eq('venue_id', venueId)
        .gte('date', range.start)
        .lte('date', range.end)
        .order('date', { ascending: true });

      if (analyticsError) throw analyticsError;

      return {
        venue,
        analytics: analyticsData || [],
        aggregated: aggregateAnalytics(analyticsData || [], [venue]),
      };
    },
    enabled: !!user && !!venueId && !!subscription?.can_view_analytics,
  });
}

/**
 * Aggregate analytics data
 */
function aggregateAnalytics(
  data: VenueAnalytics[],
  venues: Array<{ id: string; name: string; location: string }>
): AggregatedAnalytics {
  // Calculate totals
  const totals = data.reduce(
    (acc, record) => ({
      totalProfileViews: acc.totalProfileViews + (record.profile_views || 0),
      totalPhoneClicks: acc.totalPhoneClicks + (record.phone_clicks || 0),
      totalWebsiteClicks: acc.totalWebsiteClicks + (record.website_clicks || 0),
      totalDirectionClicks: acc.totalDirectionClicks + (record.direction_clicks || 0),
      totalOfferViews: acc.totalOfferViews + (record.offer_views || 0),
      totalOfferClicks: acc.totalOfferClicks + (record.offer_clicks || 0),
      totalEventViews: acc.totalEventViews + (record.event_views || 0),
    }),
    {
      totalProfileViews: 0,
      totalPhoneClicks: 0,
      totalWebsiteClicks: 0,
      totalDirectionClicks: 0,
      totalOfferViews: 0,
      totalOfferClicks: 0,
      totalEventViews: 0,
    }
  );

  const totalEngagement =
    totals.totalPhoneClicks +
    totals.totalWebsiteClicks +
    totals.totalDirectionClicks +
    totals.totalOfferClicks;

  // Group by date for daily chart
  const dailyMap = new Map<
    string,
    {
      date: string;
      profile_views: number;
      phone_clicks: number;
      website_clicks: number;
      direction_clicks: number;
      engagement: number;
    }
  >();

  data.forEach((record) => {
    const existing = dailyMap.get(record.date) || {
      date: record.date,
      profile_views: 0,
      phone_clicks: 0,
      website_clicks: 0,
      direction_clicks: 0,
      engagement: 0,
    };

    const engagement =
      (record.phone_clicks || 0) +
      (record.website_clicks || 0) +
      (record.direction_clicks || 0) +
      (record.offer_clicks || 0);

    dailyMap.set(record.date, {
      date: record.date,
      profile_views: existing.profile_views + (record.profile_views || 0),
      phone_clicks: existing.phone_clicks + (record.phone_clicks || 0),
      website_clicks: existing.website_clicks + (record.website_clicks || 0),
      direction_clicks: existing.direction_clicks + (record.direction_clicks || 0),
      engagement: existing.engagement + engagement,
    });
  });

  const dailyData = Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group by venue for breakdown
  const venueMap = new Map<
    string,
    {
      venue_id: string;
      venue_name: string;
      profile_views: number;
      total_engagement: number;
    }
  >();

  data.forEach((record) => {
    const venue = venues.find((v) => v.id === record.venue_id);
    if (!venue) return;

    const existing = venueMap.get(record.venue_id) || {
      venue_id: record.venue_id,
      venue_name: venue.name,
      profile_views: 0,
      total_engagement: 0,
    };

    const engagement =
      (record.phone_clicks || 0) +
      (record.website_clicks || 0) +
      (record.direction_clicks || 0) +
      (record.offer_clicks || 0);

    venueMap.set(record.venue_id, {
      venue_id: record.venue_id,
      venue_name: venue.name,
      profile_views: existing.profile_views + (record.profile_views || 0),
      total_engagement: existing.total_engagement + engagement,
    });
  });

  const venueBreakdown = Array.from(venueMap.values()).sort(
    (a, b) => b.profile_views - a.profile_views
  );

  return {
    ...totals,
    totalEngagement,
    dailyData,
    venueBreakdown,
  };
}
