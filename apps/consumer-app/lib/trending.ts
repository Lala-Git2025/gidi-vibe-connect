import { useCallback, useState } from 'react';
import { supabase } from '../config/supabase';

/**
 * Trending = venues an admin has promoted, and nothing else.
 *
 * This is a paid placement rail, not a popularity ranking. Businesses pay to
 * be `is_promoted`; an admin sets the badge and the end date in the admin
 * portal. So the rail shows exactly what has been sold, and when nothing is
 * sold it shows nothing — a top-rated backstop quietly filling the slot would
 * be giving away the inventory.
 *
 * Three rules are load-bearing here:
 *
 * 1. **A promotion has an end date and the app must read it.** `is_promoted`
 *    alone is not a live promotion — `promoted_until` is when it lapses. The
 *    rail used to filter on the boolean only, so a venue whose promotion
 *    expired five months earlier was still holding a sponsored slot. The admin
 *    portal already knew this (its Promotions page has a section headed
 *    "Expired promotions, still flagged is_promoted=true"); the app was the
 *    half that didn't.
 *
 * 2. **`trending_venues` is a MATERIALIZED view, refreshed every 10 minutes
 *    by pg_cron.** So a venue promoted in the admin portal is invisible to the
 *    app until the next refresh. That is why the promote action in the admin
 *    portal now calls `refresh_trending_venues()` itself rather than leaving
 *    the admin to wonder whether the click worked.
 *
 * 3. **A view outage must not take a paid placement off screen.** Nothing
 *    promoted and the view being unreadable are different facts with the same
 *    empty result, so the fallback re-asks `venues` directly with the same
 *    promotion filter. It never widens to unpromoted venues.
 */

export interface TrendingVenue {
  id: string;
  name: string;
  location: string | null;
  category: string | null;
  rating: number | null;
  live_rating: number | null;
  professional_media_urls: string[] | null;
  is_promoted: boolean;
  promoted_until: string | null;
  promotion_label: string | null;
  checkins_24h: number | null;
  checkins_7d: number | null;
  trending_score: number | null;
}

const COLUMNS =
  'id, name, location, category, rating, live_rating, professional_media_urls, ' +
  'is_promoted, promoted_until, promotion_label, checkins_24h, checkins_7d, trending_score';

const FALLBACK_COLUMNS =
  'id, name, location, category, rating, professional_media_urls, ' +
  'is_promoted, promoted_until, promotion_label';

/**
 * A promotion is live only while it is inside its window. A null
 * `promoted_until` is an open-ended promotion, which the scoring view treats
 * the same way, so the two agree.
 */
export const isPromotionLive = (v: TrendingVenue, now = Date.now()): boolean =>
  !!v.is_promoted && (!v.promoted_until || Date.parse(v.promoted_until) > now);

/**
 * `rating` is 0 on a venue nobody has rated — including, as it happens, the
 * most recently promoted one. A star next to "0.0" reads as a venue rated
 * zero rather than one not yet rated, so there is nothing to show.
 */
export const hasRating = (v: TrendingVenue): boolean =>
  typeof v.rating === 'number' && v.rating > 0;

/** Duplicate names arrive from the venue discovery agent. */
const dedupe = (list: TrendingVenue[]): TrendingVenue[] => {
  const ids = new Set<string>();
  const names = new Set<string>();
  return list.filter(v => {
    const name = v.name?.trim().toLowerCase() ?? '';
    if (ids.has(v.id) || names.has(name)) return false;
    ids.add(v.id);
    names.add(name);
    return true;
  });
};

export interface TrendingResult {
  /** Live promotions, highest scoring first, capped at the requested limit. */
  venues: TrendingVenue[];
  /** How many live promotions exist in total — so a caller can tell whether
   *  "See all" would show anything the rail isn't already showing. */
  total: number;
}

const EMPTY: TrendingResult = { venues: [], total: 0 };

export const fetchTrending = async (limit: number): Promise<TrendingResult> => {
  // Filtered server-side rather than fetched-then-trimmed, so `limit` and the
  // count both mean "live promotions" and not "rows flagged promoted".
  // toISOString() yields no commas, so it is safe inside an .or() filter list.
  const nowIso = new Date().toISOString();
  const promotionWindow = `promoted_until.is.null,promoted_until.gt.${nowIso}`;

  const { data, count, error } = await supabase
    .from('trending_venues')
    .select(COLUMNS, { count: 'exact' })
    .eq('is_promoted', true)
    .or(promotionWindow)
    .order('trending_score', { ascending: false })
    .limit(limit);

  if (!error && data) {
    return { venues: dedupe(data as unknown as TrendingVenue[]), total: count ?? data.length };
  }

  console.log('trending: view read failed, asking venues directly', error?.message);

  // Rule 3. Same filter, base table — a paid placement should not vanish
  // because the materialized view is mid-rebuild.
  const { data: direct, count: directCount } = await supabase
    .from('venues')
    .select(FALLBACK_COLUMNS, { count: 'exact' })
    .eq('is_promoted', true)
    .or(promotionWindow)
    .order('rating', { ascending: false })
    .limit(limit);

  if (!direct) return EMPTY;
  return { venues: dedupe(direct as unknown as TrendingVenue[]), total: directCount ?? direct.length };
};

export const useTrending = (limit: number) => {
  const [result, setResult] = useState<TrendingResult>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setResult(await fetchTrending(limit));
    } catch (err) {
      console.log('trending fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  return { ...result, loading, load };
};
