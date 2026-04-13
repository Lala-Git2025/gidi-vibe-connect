import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface OverviewStats {
  totalUsers: number;
  monthlyActiveUsers: number;
  totalVenues: number;
  totalEvents: number;
  activePromotions: number;
  totalCheckIns: number;
  totalRSVPs: number;
  totalReviews: number;
}

export interface GrowthPoint {
  date: string;
  count: number;
}

export interface RoleBreakdown {
  role: string;
  count: number;
}

export interface AreaBreakdown {
  area: string;
  count: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface TopVenue {
  id: string;
  name: string;
  location: string;
  category: string;
  rating: number;
  trending_score: number;
  checkins_24h: number;
  checkins_7d: number;
}

export interface TierBreakdown {
  tier: string;
  count: number;
}

export interface EventStat {
  title: string;
  rsvp_count: number;
  date: string;
}

export interface RecentActivity {
  type: 'signup' | 'checkin' | 'rsvp' | 'review';
  user_name: string;
  detail: string;
  time: string;
}

// ── Overview stats ──────────────────────────────────────

export function useOverviewStats() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

      const [
        usersRes,
        venuesRes,
        eventsRes,
        promoRes,
        checkInsRes,
        rsvpsRes,
        reviewsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('venues').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('venues').select('id', { count: 'exact', head: true })
          .eq('is_promoted', true).gt('promoted_until', now.toISOString()),
        supabase.from('venue_check_ins').select('id', { count: 'exact', head: true }),
        supabase.from('event_rsvps').select('id', { count: 'exact', head: true }),
        supabase.from('venue_reviews').select('id', { count: 'exact', head: true }),
      ]);

      // MAU: users who have any check-in or RSVP in last 30 days
      const { data: mauCheckins } = await supabase
        .from('venue_check_ins')
        .select('user_id')
        .gt('checked_in_at', thirtyDaysAgo);
      const { data: mauRsvps } = await supabase
        .from('event_rsvps')
        .select('user_id')
        .gt('rsvp_at', thirtyDaysAgo);

      const activeUserIds = new Set<string>();
      mauCheckins?.forEach(r => activeUserIds.add(r.user_id));
      mauRsvps?.forEach(r => activeUserIds.add(r.user_id));

      setStats({
        totalUsers: usersRes.count ?? 0,
        monthlyActiveUsers: activeUserIds.size,
        totalVenues: venuesRes.count ?? 0,
        totalEvents: eventsRes.count ?? 0,
        activePromotions: promoRes.count ?? 0,
        totalCheckIns: checkInsRes.count ?? 0,
        totalRSVPs: rsvpsRes.count ?? 0,
        totalReviews: reviewsRes.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  return { stats, loading };
}

// ── User growth (signups per day, last 30 days) ─────────

export function useUserGrowth() {
  const [data, setData] = useState<GrowthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: users } = await supabase
        .from('profiles')
        .select('created_at')
        .gt('created_at', thirtyDaysAgo)
        .order('created_at');

      // Group by date
      const counts: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        counts[d.toISOString().split('T')[0]] = 0;
      }
      users?.forEach(u => {
        const day = u.created_at.split('T')[0];
        if (counts[day] !== undefined) counts[day]++;
      });

      setData(Object.entries(counts).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      })));
      setLoading(false);
    }
    load();
  }, []);

  return { data, loading };
}

// ── Users by role ────────────────────────────────────────

export function useRoleBreakdown() {
  const [data, setData] = useState<RoleBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const roles = ['Consumer', 'Business Owner', 'Content Creator', 'Admin', 'Super Admin'];
      const results = await Promise.all(
        roles.map(async (role) => {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', role);
          return { role, count: count ?? 0 };
        })
      );
      setData(results.filter(r => r.count > 0));
      setLoading(false);
    }
    load();
  }, []);

  return { data, loading };
}

// ── Venues by area ───────────────────────────────────────

export function useVenuesByArea() {
  const [data, setData] = useState<AreaBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const areas = ['Victoria Island', 'Lekki', 'Ikoyi', 'Ikeja', 'Yaba', 'Surulere'];
      const results = await Promise.all(
        areas.map(async (area) => {
          const { count } = await supabase
            .from('venues')
            .select('id', { count: 'exact', head: true })
            .ilike('location', `%${area}%`);
          return { area, count: count ?? 0 };
        })
      );

      // Get "Other" count
      const totalRes = await supabase.from('venues').select('id', { count: 'exact', head: true });
      const knownCount = results.reduce((sum, r) => sum + r.count, 0);
      const otherCount = (totalRes.count ?? 0) - knownCount;
      if (otherCount > 0) results.push({ area: 'Other', count: otherCount });

      setData(results.filter(r => r.count > 0));
      setLoading(false);
    }
    load();
  }, []);

  return { data, loading };
}

// ── Venues by category ───────────────────────────────────

export function useVenuesByCategory() {
  const [data, setData] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: venues } = await supabase
        .from('venues')
        .select('category');

      const counts: Record<string, number> = {};
      venues?.forEach(v => {
        const cat = v.category || 'Uncategorized';
        counts[cat] = (counts[cat] || 0) + 1;
      });

      setData(
        Object.entries(counts)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
      );
      setLoading(false);
    }
    load();
  }, []);

  return { data, loading };
}

// ── Top venues by trending score ─────────────────────────

export function useTopVenues() {
  const [data, setData] = useState<TopVenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: venues } = await supabase
        .from('trending_venues')
        .select('id, name, location, category, rating, trending_score, checkins_24h, checkins_7d')
        .order('trending_score', { ascending: false })
        .limit(10);

      setData((venues as TopVenue[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return { data, loading };
}

// ── Business subscription tiers ──────────────────────────

export function useTierBreakdown() {
  const [data, setData] = useState<TierBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const tiers = ['Free', 'Premium', 'Enterprise'];
      const results = await Promise.all(
        tiers.map(async (tier) => {
          const { count } = await supabase
            .from('business_subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('tier', tier);
          return { tier, count: count ?? 0 };
        })
      );
      setData(results.filter(r => r.count > 0));
      setLoading(false);
    }
    load();
  }, []);

  return { data, loading };
}

// ── Top events by RSVPs ──────────────────────────────────

export function useTopEvents() {
  const [data, setData] = useState<EventStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Get RSVP counts per event
      const { data: rsvps } = await supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('status', 'going');

      const rsvpCounts: Record<string, number> = {};
      rsvps?.forEach(r => {
        rsvpCounts[r.event_id] = (rsvpCounts[r.event_id] || 0) + 1;
      });

      // Get top event IDs
      const topIds = Object.entries(rsvpCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      if (topIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const { data: events } = await supabase
        .from('events')
        .select('id, title, start_date')
        .in('id', topIds);

      const result = (events ?? []).map(e => ({
        title: e.title,
        rsvp_count: rsvpCounts[e.id] || 0,
        date: e.start_date,
      })).sort((a, b) => b.rsvp_count - a.rsvp_count);

      setData(result);
      setLoading(false);
    }
    load();
  }, []);

  return { data, loading };
}

// ── Recent activity feed ─────────────────────────────────

export function useRecentActivity() {
  const [data, setData] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const activities: RecentActivity[] = [];

      // Recent signups
      const { data: signups } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      signups?.forEach(s => activities.push({
        type: 'signup',
        user_name: s.full_name || 'New user',
        detail: 'signed up',
        time: s.created_at,
      }));

      // Recent check-ins
      const { data: checkins } = await supabase
        .from('venue_check_ins')
        .select('user_id, venue_id, checked_in_at')
        .order('checked_in_at', { ascending: false })
        .limit(5);
      if (checkins && checkins.length > 0) {
        const userIds = [...new Set(checkins.map(c => c.user_id))];
        const venueIds = [...new Set(checkins.map(c => c.venue_id))];
        const [{ data: users }, { data: venues }] = await Promise.all([
          supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
          supabase.from('venues').select('id, name').in('id', venueIds),
        ]);
        const userMap = Object.fromEntries((users ?? []).map(u => [u.user_id, u.full_name || 'User']));
        const venueMap = Object.fromEntries((venues ?? []).map(v => [v.id, v.name]));
        checkins.forEach(c => activities.push({
          type: 'checkin',
          user_name: userMap[c.user_id] || 'User',
          detail: `checked in at ${venueMap[c.venue_id] || 'a venue'}`,
          time: c.checked_in_at,
        }));
      }

      // Recent RSVPs
      const { data: rsvps } = await supabase
        .from('event_rsvps')
        .select('user_id, event_id, rsvp_at')
        .order('rsvp_at', { ascending: false })
        .limit(5);
      if (rsvps && rsvps.length > 0) {
        const userIds = [...new Set(rsvps.map(r => r.user_id))];
        const eventIds = [...new Set(rsvps.map(r => r.event_id))];
        const [{ data: users }, { data: events }] = await Promise.all([
          supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
          supabase.from('events').select('id, title').in('id', eventIds),
        ]);
        const userMap = Object.fromEntries((users ?? []).map(u => [u.user_id, u.full_name || 'User']));
        const eventMap = Object.fromEntries((events ?? []).map(e => [e.id, e.title]));
        rsvps.forEach(r => activities.push({
          type: 'rsvp',
          user_name: userMap[r.user_id] || 'User',
          detail: `RSVP'd to ${eventMap[r.event_id] || 'an event'}`,
          time: r.rsvp_at,
        }));
      }

      // Sort all by time descending
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setData(activities.slice(0, 15));
      setLoading(false);
    }
    load();
  }, []);

  return { data, loading };
}
