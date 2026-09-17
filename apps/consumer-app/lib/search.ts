/**
 * Universal search — the data layer behind the Home search bar.
 *
 * Home's search bar used to navigate to Explore with no params, which meant a
 * control labelled "Search venues, areas…" did neither: it opened an unfiltered
 * venue list with the keyboard down, and areas were not reachable from it at
 * all. This searches the five things the app actually holds — venues, Lagos
 * areas, events, Gidi News, people — and every result knows where it opens.
 *
 * Three things here are load-bearing and easy to lose in a refactor:
 *
 * 1. **The query is sanitised before it reaches PostgREST.** `.or()` takes a
 *    comma-separated filter list, so a comma the user typed would split it and
 *    silently change which columns are searched. See `sanitise`.
 *
 * 2. **Stale responses are discarded, not merged.** Five requests per keystroke
 *    over a Lagos mobile connection reorder constantly; without the run guard
 *    the answer for "l" lands after the answer for "lekki" and replaces it.
 *
 * 3. **Which field matched outranks how well it matched.** A hit in a thing's
 *    own name beats a hit in its address, which beats a hit in its description.
 *    See `rank`.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { LAGOS_AREAS } from './areas';

export type ResultKind = 'venue' | 'area' | 'event' | 'news' | 'person';

export interface SearchResult {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Destination screen and the params that make it open on this result. */
  screen: string;
  params?: Record<string, any>;
  /** Match quality, 1–12. Sorts within a group and ranks the groups. See `rank`. */
  score: number;
}

export interface SearchGroup {
  kind: ResultKind;
  label: string;
  /**
   * Every match, best first. The screen shows the first PER_GROUP and reveals
   * the rest on demand — the list is capped for reading, never for reach.
   */
  results: SearchResult[];
  total: number;
  /**
   * A screen that can show this whole group filtered by the same query, for
   * groups whose own screen has a free-text filter. Null means there is no
   * such screen, and the extras expand in place instead.
   */
  overflow: { screen: string; params?: Record<string, any> } | null;
}

/** Below this, searching is noise — two characters match half the database. */
export const MIN_QUERY_LENGTH = 2;

/** Long enough to skip intermediate keystrokes, short enough to feel live. */
const DEBOUNCE_MS = 220;

/** Rows shown per group before "show more". Never a limit on what was found. */
export const PER_GROUP = 5;

/** How many rows to pull per table before scoring and capping client-side. */
const FETCH_LIMIT = 25;

// ── Query hygiene ───────────────────────────────────────────────────────────

/**
 * PostgREST reads `.or(...)` as a comma-separated list of filters and treats
 * `%` and `*` as wildcards inside `ilike`. A raw query string is therefore not
 * safe to interpolate: a comma splits the filter list and changes which columns
 * are searched, and a stray `%` widens the match without the user asking. There
 * is no escape syntax for the list separator, so these are stripped rather than
 * escaped — a search for "bar, lounge" becomes "bar lounge", which is what the
 * person meant anyway.
 */
const sanitise = (raw: string): string =>
  raw.replace(/[,()%*\\"']/g, ' ').replace(/\s+/g, ' ').trim();

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 4 exact · 3 starts-with · 2 starts a word · 1 appears somewhere · 0 no match.
 *
 * The word-start tier is the one that earns its keep: without it "Terra"
 * matching "Terra Kulture" and "Mediterranean" score the same, and the
 * restaurant nobody searched for outranks the one they did.
 */
const score = (haystack: string | null | undefined, needle: string): number => {
  if (!haystack) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 4;
  if (h.startsWith(n)) return 3;
  if (new RegExp(`\\b${escapeRegExp(n)}`).test(h)) return 2;
  return h.includes(n) ? 1 : 0;
};

/** Best score across several fields — a venue matches on any of them. */
const bestScore = (fields: Array<string | null | undefined>, needle: string): number =>
  fields.reduce<number>((best, f) => Math.max(best, score(f, needle)), 0);

/**
 * Which field matched matters more than how well it matched, so the four
 * quality tiers above are stacked inside three field tiers:
 *
 *   9–12  the thing's own name       ("Lekki" → the area Lekki)
 *   5–8   where the thing is         ("Lekki" → a bar whose location is Lekki)
 *   1–4   anything else              (category, description, article body)
 *
 * Without the split every venue whose `location` reads "Lekki" scored a
 * perfect 4 and tied with the area actually called Lekki, so searching a place
 * by name led with something other than that place.
 */
const rank = (
  name: Array<string | null | undefined>,
  place: Array<string | null | undefined>,
  other: Array<string | null | undefined>,
  needle: string,
): number => {
  const n = bestScore(name, needle);
  if (n > 0) return n + 8;
  const p = bestScore(place, needle);
  if (p > 0) return p + 4;
  return bestScore(other, needle);
};

/** A name match at least as strong as "starts with". Promotes its group. */
const NAME_MATCH_FLOOR = 8 + 3;

const byScore = (a: SearchResult, b: SearchResult) => b.score - a.score;

// ── Per-source searches ─────────────────────────────────────────────────────

const searchAreas = (q: string): SearchResult[] =>
  LAGOS_AREAS
    // Aliases are matched too, so "V/I" and "Chevron" find their areas even
    // though neither is the area's display name.
    .map(area => ({
      area,
      // An area is nothing but its names, so all of them are primary.
      score: rank([area.name, area.shortName, ...area.aliases], [], [], q),
    }))
    .filter(({ score: s }) => s > 0)
    .map(({ area, score: s }) => ({
      kind: 'area' as const,
      id: area.id,
      title: area.name,
      subtitle: area.blurb,
      icon: area.icon,
      screen: 'ExploreArea',
      params: { area: area.id },
      score: s,
    }));

const searchVenues = async (q: string): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, location, category, description')
    .or(
      `name.ilike.%${q}%,location.ilike.%${q}%,` +
      `category.ilike.%${q}%,description.ilike.%${q}%`,
    )
    .limit(FETCH_LIMIT);

  if (error || !data) return [];

  return (data as any[]).map(v => ({
    kind: 'venue' as const,
    id: v.id,
    title: v.name,
    // Category and area are what distinguishes two venues with similar names.
    subtitle: [v.category, v.location].filter(Boolean).join(' · ') || 'Venue',
    icon: 'business' as const,
    screen: 'Explore',
    // Explore already opens its detail modal for a venueId param.
    params: { venueId: v.id },
    score: rank([v.name], [v.location], [v.category, v.description], q),
  }));
};

const searchEvents = async (q: string): Promise<SearchResult[]> => {
  // The same 6h grace the Events screen uses, so an event that started an hour
  // ago is still findable by someone deciding whether to head out.
  const windowStart = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('id, title, venue_name, location, start_date, category')
    .eq('is_active', true)
    .gte('start_date', windowStart)
    .or(
      `title.ilike.%${q}%,venue_name.ilike.%${q}%,` +
      `location.ilike.%${q}%,category.ilike.%${q}%`,
    )
    .order('start_date', { ascending: true })
    .limit(FETCH_LIMIT);

  if (error || !data) return [];

  return (data as any[]).map(e => ({
    kind: 'event' as const,
    id: e.id,
    title: e.title,
    subtitle: [formatEventDate(e.start_date), e.venue_name].filter(Boolean).join(' · '),
    icon: 'calendar' as const,
    screen: 'Events',
    params: { eventId: e.id },
    score: rank([e.title], [e.venue_name, e.location], [e.category], q),
  }));
};

const searchNews = async (q: string): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('news')
    .select('id, title, gidi_headline, brief, summary, source, publish_date')
    .eq('is_active', true)
    .is('duplicate_of', null)   // one story, once — the editor agent marks repeats
    .or(
      `gidi_headline.ilike.%${q}%,title.ilike.%${q}%,` +
      `brief.ilike.%${q}%,summary.ilike.%${q}%`,
    )
    .order('publish_date', { ascending: false })
    .limit(FETCH_LIMIT);

  if (error || !data) return [];

  // Note the feed's relevance floor is deliberately NOT applied here. Dropping
  // low-relevance stories is right when someone is browsing a feed they did not
  // ask for; it is wrong when they have typed the story's own subject in.
  //
  // `duplicate_of` above only collapses what the editor agent has paired, and
  // it misses cross-outlet reposts of the same wording — a search for "lekki"
  // returned one machete story three times, from two outlets and an aggregator.
  // Collapsing on the headline itself catches those, newest kept.
  const seen = new Set<string>();
  const unique = (data as any[]).filter(n => {
    const key = (n.gidi_headline || n.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.map(n => ({
    kind: 'news' as const,
    id: n.id,
    title: n.gidi_headline || n.title,
    subtitle: [n.source, formatNewsDate(n.publish_date)].filter(Boolean).join(' · '),
    icon: 'newspaper' as const,
    screen: 'News',
    params: { newsId: n.id },
    // The headline is what the row shows, so a body-only match ranks lower.
    score: rank([n.gidi_headline, n.title], [], [n.brief, n.summary], q),
  }));
};

const searchPeople = async (q: string): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, username, bio')
    .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(FETCH_LIMIT);

  if (error || !data) return [];

  return (data as any[])
    .filter(p => p.full_name || p.username)
    .map(p => ({
      kind: 'person' as const,
      id: p.user_id,
      title: p.full_name || p.username,
      subtitle: p.username ? `@${p.username}` : 'On Gidi Connect',
      icon: 'person' as const,
      screen: 'Social',
      // Social's People tab filters on a name, so hand it one rather than
      // duplicating the follow-state machinery that tab already owns.
      params: { view: 'people', peopleSearch: p.full_name || p.username },
      score: rank([p.full_name, p.username], [], [], q),
    }));
};

// ── Formatting ──────────────────────────────────────────────────────────────

const formatEventDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatNewsDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hours = Math.floor((Date.now() - d.getTime()) / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
};

// ── Grouping ────────────────────────────────────────────────────────────────

const GROUP_LABEL: Record<ResultKind, string> = {
  venue: 'Venues',
  area: 'Areas',
  event: 'Events',
  news: 'Gidi News',
  person: 'People',
};

/**
 * Default group order, overridden only by the promotion rule in `group`.
 *
 * This is a product judgement, not a ranking one: Gidi Connect is for deciding
 * where to go tonight, so venues and areas lead and news supports. Ordering
 * purely by score put a 19-day-old crime story above every bar in Lekki,
 * because the headline contained the word and the bars only sat in the place.
 */
const GROUP_PRIORITY: ResultKind[] = ['venue', 'area', 'event', 'person', 'news'];

/** Where a group's overflow sends you, pre-filtered by the same query. */
const overflowFor = (kind: ResultKind, q: string): SearchGroup['overflow'] => {
  switch (kind) {
    case 'venue':  return { screen: 'Explore', params: { search: q } };
    case 'person': return { screen: 'Social', params: { view: 'people', peopleSearch: q } };
    // Events and News have no free-text filter of their own yet, so their
    // extras expand inside the results list rather than sending someone to a
    // screen that would drop the query. Areas never overflows — 25 in total.
    default:       return null;
  }
};

const group = (results: SearchResult[], q: string): SearchGroup[] => {
  const byKind = new Map<ResultKind, SearchResult[]>();
  for (const r of results) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind)!.push(r);
  }

  return [...byKind.entries()]
    .map(([kind, rows]) => {
      const sorted = [...rows].sort(byScore);
      return {
        kind,
        label: GROUP_LABEL[kind],
        results: sorted,
        total: sorted.length,
        overflow: sorted.length > PER_GROUP ? overflowFor(kind, q) : null,
      };
    })
    .sort((a, b) => {
      // One promotion rule on top of the fixed order: a group holding
      // something actually *called* what was typed jumps to the front. So
      // "Lekki" leads with the area Lekki and "Terra" leads with Terra
      // Kulture, while everything else keeps a stable, predictable order
      // rather than reshuffling on every keystroke.
      const best = (g: SearchGroup) => g.results[0]?.score ?? 0;
      const named = (g: SearchGroup) => (best(g) >= NAME_MATCH_FLOOR ? 1 : 0);
      return (
        named(b) - named(a) ||
        (named(a) ? best(b) - best(a) : 0) ||
        GROUP_PRIORITY.indexOf(a.kind) - GROUP_PRIORITY.indexOf(b.kind)
      );
    });
};

// ── Hook ────────────────────────────────────────────────────────────────────

export const useSearch = (query: string) => {
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  /** Monotonic id of the newest run; anything older is discarded on arrival. */
  const runId = useRef(0);

  useEffect(() => {
    const q = sanitise(query);

    if (q.length < MIN_QUERY_LENGTH) {
      runId.current += 1;      // cancel anything already in flight
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++runId.current;

    const timer = setTimeout(async () => {
      try {
        // Areas are local and resolve immediately; the rest are one round trip
        // each, fired together rather than in sequence.
        const [venues, events, news, people] = await Promise.all([
          searchVenues(q),
          searchEvents(q),
          searchNews(q),
          searchPeople(q),
        ]);

        if (id !== runId.current) return;   // a newer query has since started

        const all = [...searchAreas(q), ...venues, ...events, ...news, ...people]
          .filter(r => r.score > 0);
        setGroups(group(all, q));
      } catch (err) {
        console.log('Search error:', err);
        if (id === runId.current) setGroups([]);
      } finally {
        if (id === runId.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const total = groups.reduce((sum, g) => sum + g.total, 0);
  return { groups, loading, total };
};

// ── Recent searches ─────────────────────────────────────────────────────────

const RECENT_KEY = 'gidi.search.recent';
const MAX_RECENT = 8;

export const useRecentSearches = () => {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then(raw => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed.filter(t => typeof t === 'string'));
      })
      // A corrupt or unreadable store is not worth an error state — the list
      // is a convenience, and an empty one is a correct empty one.
      .catch(() => {});
  }, []);

  const persist = useCallback((next: string[]) => {
    setRecent(next);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const remember = useCallback((term: string) => {
    const clean = term.trim();
    if (clean.length < MIN_QUERY_LENGTH) return;
    setRecent(prev => {
      // Case-insensitive de-dupe, newest first, so searching the same thing
      // twice moves it up rather than listing it twice.
      const next = [clean, ...prev.filter(t => t.toLowerCase() !== clean.toLowerCase())]
        .slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clear = useCallback(() => persist([]), [persist]);

  return { recent, remember, clear };
};
