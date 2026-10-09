import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';

/**
 * Who is actually engaging with this owner's venues and events.
 *
 * The sidebar has linked to /audience since it was written and no such route
 * existed, so the item rendered a blank screen. Nothing new had to be
 * collected to build it: check-ins, reviews and RSVPs all already carry a
 * user id.
 *
 * Deliberately NOT a customer list. It reports engagement — who came back,
 * what they rated you — and never exposes an email or a phone number. An
 * owner has no claim on a consumer's contact details just because that person
 * walked into their bar, and RLS on `profiles` would not serve them anyway.
 */

export interface AudienceMember {
  user_id: string;
  name: string;
  avatar_url: string | null;
  checkIns: number;
  reviews: number;
  rsvps: number;
  /** Highest-signal interaction wins when labelling the row. */
  lastSeen: string;
  lastAction: string;
}

export interface AudienceSummary {
  members: AudienceMember[];
  totalPeople: number;
  repeatVisitors: number;
  totalCheckIns: number;
  totalReviews: number;
  totalRsvps: number;
  averageRating: number | null;
}

const EMPTY: AudienceSummary = {
  members: [], totalPeople: 0, repeatVisitors: 0,
  totalCheckIns: 0, totalReviews: 0, totalRsvps: 0, averageRating: null,
};

export function useAudience() {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['audience', user?.id],
    queryFn: async (): Promise<AudienceSummary> => {
      if (!user) return EMPTY;

      const [{ data: venues }, { data: events }] = await Promise.all([
        supabase.from('venues').select('id, name').eq('owner_id', user.id),
        supabase.from('events').select('id, title').eq('organizer_id', user.id),
      ]);

      const venueIds = (venues ?? []).map((v: any) => v.id);
      const eventIds = (events ?? []).map((e: any) => e.id);
      if (venueIds.length === 0 && eventIds.length === 0) return EMPTY;

      const venueName = new Map((venues ?? []).map((v: any) => [v.id, v.name]));
      const eventName = new Map((events ?? []).map((e: any) => [e.id, e.title]));

      const [checkIns, reviews, rsvps] = await Promise.all([
        venueIds.length
          ? supabase.from('venue_check_ins').select('user_id, venue_id, checked_in_at').in('venue_id', venueIds)
          : Promise.resolve({ data: [] as any[] }),
        venueIds.length
          ? supabase.from('venue_reviews').select('user_id, venue_id, rating, created_at').in('venue_id', venueIds)
          : Promise.resolve({ data: [] as any[] }),
        eventIds.length
          // `rsvp_at`, not `created_at` — this table has no created_at column.
          ? supabase.from('event_rsvps').select('user_id, event_id, rsvp_at').in('event_id', eventIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const byUser = new Map<string, AudienceMember>();
      const touch = (userId: string): AudienceMember => {
        let m = byUser.get(userId);
        if (!m) {
          m = {
            user_id: userId, name: 'Someone', avatar_url: null,
            checkIns: 0, reviews: 0, rsvps: 0,
            lastSeen: '', lastAction: '',
          };
          byUser.set(userId, m);
        }
        return m;
      };

      const record = (m: AudienceMember, at: string, action: string) => {
        if (!at) return;
        if (!m.lastSeen || new Date(at) > new Date(m.lastSeen)) {
          m.lastSeen = at;
          m.lastAction = action;
        }
      };

      for (const r of (checkIns.data ?? []) as any[]) {
        if (!r.user_id) continue;
        const m = touch(r.user_id);
        m.checkIns += 1;
        record(m, r.checked_in_at, `Checked in at ${venueName.get(r.venue_id) ?? 'your venue'}`);
      }
      for (const r of (reviews.data ?? []) as any[]) {
        if (!r.user_id) continue;
        const m = touch(r.user_id);
        m.reviews += 1;
        record(m, r.created_at, `Left a ${r.rating}★ review for ${venueName.get(r.venue_id) ?? 'your venue'}`);
      }
      for (const r of (rsvps.data ?? []) as any[]) {
        if (!r.user_id) continue;
        const m = touch(r.user_id);
        m.rsvps += 1;
        record(m, r.rsvp_at, `RSVP'd to ${eventName.get(r.event_id) ?? 'your event'}`);
      }

      const members = [...byUser.values()];
      if (members.length > 0) {
        // One round trip for every display name, rather than one per row.
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', members.map(m => m.user_id));

        const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
        for (const m of members) {
          const p = profileMap.get(m.user_id);
          m.name = p?.full_name || p?.username || 'Someone';
          m.avatar_url = p?.avatar_url ?? null;
        }
      }

      members.sort((a, b) => {
        const engagement = (m: AudienceMember) => m.checkIns + m.reviews * 3 + m.rsvps * 2;
        return engagement(b) - engagement(a)
          || new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      });

      const ratings = ((reviews.data ?? []) as any[]).map(r => r.rating).filter((n: any) => typeof n === 'number');

      return {
        members,
        totalPeople: members.length,
        repeatVisitors: members.filter(m => m.checkIns > 1).length,
        totalCheckIns: (checkIns.data ?? []).length,
        totalReviews: (reviews.data ?? []).length,
        totalRsvps: (rsvps.data ?? []).length,
        averageRating: ratings.length
          ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
          : null,
      };
    },
    enabled: !!user,
  });
}
