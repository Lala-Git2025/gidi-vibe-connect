import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';

/**
 * The header search, which until now was a bare `<input>` with no value, no
 * handler and a ⌘K hint that did nothing — the same shape as the consumer
 * app's Home search bar before it was fixed.
 *
 * It searches only what this owner owns: their venues and their events. A
 * business console search that returned other people's venues would be a
 * data leak dressed as a feature, and RLS would reject it anyway.
 */

export interface SearchHit {
  kind: 'venue' | 'event';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/**
 * PostgREST's `.or()` takes a comma-separated filter list, so a comma the user
 * typed splits it and silently changes which columns are searched. `%` and `*`
 * are wildcards inside `ilike`. There is no escape syntax for the list
 * separator, so they are stripped rather than escaped — same rule as
 * consumer-app/lib/search.ts.
 */
const sanitise = (q: string): string => q.replace(/[,%*()]/g, ' ').trim();

export function useBusinessSearch(rawQuery: string) {
  const { user } = useBusinessAuth();
  const q = sanitise(rawQuery);

  return useQuery({
    queryKey: ['business-search', user?.id, q],
    queryFn: async (): Promise<SearchHit[]> => {
      if (!user || q.length < 2) return [];

      const [venues, events] = await Promise.all([
        supabase
          .from('venues')
          .select('id, name, location, category')
          .eq('owner_id', user.id)
          .or(`name.ilike.%${q}%,location.ilike.%${q}%,category.ilike.%${q}%`)
          .limit(5),
        supabase
          .from('events')
          .select('id, title, venue_name, start_date')
          .eq('organizer_id', user.id)
          .or(`title.ilike.%${q}%,venue_name.ilike.%${q}%`)
          .order('start_date', { ascending: false })
          .limit(5),
      ]);

      const hits: SearchHit[] = [
        ...((venues.data ?? []) as any[]).map(v => ({
          kind: 'venue' as const,
          id: v.id,
          title: v.name,
          subtitle: [v.category, v.location].filter(Boolean).join(' · '),
          href: `/venues/${v.id}`,
        })),
        ...((events.data ?? []) as any[]).map(e => ({
          kind: 'event' as const,
          id: e.id,
          title: e.title,
          subtitle: [
            e.venue_name,
            e.start_date ? new Date(e.start_date).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short', year: 'numeric',
            }) : null,
          ].filter(Boolean).join(' · '),
          href: `/events/${e.id}`,
        })),
      ];

      // A hit whose name actually starts with what was typed outranks one that
      // merely contains it somewhere — otherwise "Bar" leads with a venue whose
      // *location* happens to contain it.
      const lower = q.toLowerCase();
      return hits.sort((a, b) => {
        const score = (h: SearchHit) =>
          h.title.toLowerCase().startsWith(lower) ? 0 : h.title.toLowerCase().includes(lower) ? 1 : 2;
        return score(a) - score(b);
      });
    },
    enabled: !!user && q.length >= 2,
    // Results for a query the user has already typed past are worthless, and
    // react-query keys on `q`, so a stale response can never replace a newer
    // one — the monotonic-run-id problem solved by the cache instead.
    staleTime: 30_000,
  });
}
