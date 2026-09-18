/**
 * Lagos traffic — shared data layer for the Home preview and the full screen.
 *
 * The rules that matter, and why:
 *
 * 1. **Severity outranks recency.** The old rail was ordered newest-first, so
 *    "free flowing" from ten minutes ago sat above gridlock on Lagos-Ibadan.
 *    Nobody opens a traffic feature to learn which roads are fine.
 *
 * 2. **Age is stated, never implied.** The old header read "Updated 09:14"
 *    from the client's last *fetch* and sat under a pulsing green dot, while
 *    the report underneath it could be twenty hours old. Freshness here is
 *    measured from when the report was published, and anything past
 *    FRESH_WINDOW is separated out rather than quietly mixed in.
 */

import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

/** How far back to fetch at all. Beyond this a report is not worth showing. */
const LOOKBACK_MS = 12 * 60 * 60 * 1000;

/** Within this, a report counts as current. Past it, it is "earlier today". */
export const FRESH_WINDOW_MS = 4 * 60 * 60 * 1000;

export type Severity = 'light' | 'moderate' | 'heavy' | 'critical' | 'closed';

export interface TrafficReport {
  id: string;
  route_label: string;
  area: string | null;
  severity: Severity;
  summary: string;
  source_name: string;
  source_url: string | null;
  source_published_at: string | null;
  scraped_at: string;
}

/**
 * One tone per severity, named as palette keys so both themes resolve
 * correctly. The previous version hardcoded dark-theme hex values, which meant
 * the severity colours were wrong on the light theme the app defaults to.
 */
export const SEVERITY: Record<Severity, {
  label: string;
  tone: 'error' | 'warning' | 'success';
  rank: number;
}> = {
  closed:   { label: 'Closed',   tone: 'error',   rank: 4 },
  critical: { label: 'Gridlock', tone: 'error',   rank: 3 },
  heavy:    { label: 'Heavy',    tone: 'error',   rank: 2 },
  moderate: { label: 'Slow',     tone: 'warning', rank: 1 },
  light:    { label: 'Moving',   tone: 'success', rank: 0 },
};

/** When a report describes the road, falling back to when we scraped it. */
export const reportedAt = (r: TrafficReport): number =>
  new Date(r.source_published_at ?? r.scraped_at).getTime();

export const isFreshAt = (ms: number, now = Date.now()): boolean =>
  now - ms <= FRESH_WINDOW_MS;

export const isFresh = (r: TrafficReport, now = Date.now()): boolean =>
  isFreshAt(reportedAt(r), now);

/** "Just now" / "18m ago" / "3h ago" / "yesterday". */
export const timeAgo = (ms: number, now = Date.now()): string => {
  const minutes = Math.max(0, Math.floor((now - ms) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return 'Yesterday';
};

/**
 * A one-line answer to "should I leave now" — the thing most people opened the
 * section for, readable before they scroll.
 */
// Accepts anything with a severity so the same line can summarise live route
// readings (which carry no narrative) as readily as radio reports.
export const verdict = (reports: Array<{ severity: Severity }>): string => {
  if (reports.length === 0) return '';
  // Each bucket uses the same word the row beneath it shows, so the verdict
  // never says "1 heavy" above a card labelled GRIDLOCK.
  const count = (s: Severity) => reports.filter(r => r.severity === s).length;
  const closed = count('closed');
  const gridlock = count('critical');
  const heavy = count('heavy');
  const slow = count('moderate');
  const moving = count('light');

  return [
    closed   && `${closed} closed`,
    gridlock && `${gridlock} gridlock`,
    heavy    && `${heavy} heavy`,
    slow     && `${slow} slow`,
    moving   && `${moving} moving`,
  ].filter(Boolean).join(' · ');
};

/**
 * Worst first, then most recent. Applied within a freshness bucket, never
 * across one — a stale gridlock report must not outrank a current one.
 */
const bySeverityThenRecency = (a: TrafficReport, b: TrafficReport): number =>
  SEVERITY[b.severity].rank - SEVERITY[a.severity].rank || reportedAt(b) - reportedAt(a);

export interface TrafficData {
  /** Published within FRESH_WINDOW, worst first. */
  fresh: TrafficReport[];
  /** Older than FRESH_WINDOW but within LOOKBACK, worst first. */
  earlier: TrafficReport[];
  /** Every report, fresh block first. */
  all: TrafficReport[];
  /** Timestamp of the most recent report, or null when there are none. */
  newestAt: number | null;
}

const EMPTY: TrafficData = { fresh: [], earlier: [], all: [], newestAt: null };

export const useTrafficReports = () => {
  const [data, setData] = useState<TrafficData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sinceIso = new Date(Date.now() - LOOKBACK_MS).toISOString();
      const { data: rows, error } = await supabase
        .from('traffic_reports')
        .select('id, route_label, area, severity, summary, source_name, source_url, source_published_at, scraped_at')
        .gt('scraped_at', sinceIso)
        .order('scraped_at', { ascending: false })
        .limit(80);

      if (error || !rows) return;

      // One row per route: the newest classification wins. The source often
      // re-posts the same route through the day.
      const seen = new Set<string>();
      const latest: TrafficReport[] = [];
      for (const row of [...(rows as TrafficReport[])].sort((a, b) => reportedAt(b) - reportedAt(a))) {
        if (seen.has(row.route_label)) continue;
        seen.add(row.route_label);
        latest.push(row);
      }

      const now = Date.now();
      const fresh = latest.filter(r => isFresh(r, now)).sort(bySeverityThenRecency);
      const earlier = latest.filter(r => !isFresh(r, now)).sort(bySeverityThenRecency);

      setData({
        fresh,
        earlier,
        all: [...fresh, ...earlier],
        newestAt: latest.length ? Math.max(...latest.map(reportedAt)) : null,
      });
    } catch (err) {
      console.log('Traffic fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { ...data, loading, load };
};

// ── Live routes (Google Routes API) ─────────────────────────────────────────
// The quantitative half of the hybrid. `traffic_reports` above is human-sourced
// and says WHY a road is bad, but only when someone posts. These rows say HOW
// MUCH slower a curated set of corridors is right now versus a clear road, and
// they are overwritten on every run of scripts/live-traffic-agent.js — so they
// are always the freshest thing on the screen, and they never explain anything.

/**
 * How this reading compares with what the corridor normally does at this hour
 * on this day of the week. `null` means no baseline row exists yet — show the
 * severity alone and omit the comparison rather than inventing one.
 */
export type VsUsual = 'better' | 'normal' | 'worse' | 'much_worse';

export interface LiveRoute {
  id: string;
  route_key: string;
  route_label: string;
  duration_seconds: number | null;
  /**
   * MISNOMER kept for compatibility: this is Google `staticDuration`, the
   * FREE-FLOW drive with no traffic — not a typical one. Used only to derive
   * `severity`. For what the road usually takes, use expected_duration_seconds.
   */
  typical_duration_seconds: number | null;
  /** What this corridor normally takes at this hour on this weekday. */
  expected_duration_seconds: number | null;
  vs_usual: VsUsual | null;
  distance_meters: number | null;
  /** Never 'closed' — a duration ratio can't tell a closure from gridlock. */
  severity: Exclude<Severity, 'closed'> | null;
  updated_at: string;
}

/**
 * The two axes, and why the row shows both.
 *
 * `severity` answers "how congested is this road" against a free-flow drive.
 * `vs_usual` answers "is this unusual" against what the road does at this hour
 * on this day. They are independent, and the combination is the useful part:
 * HEAVY + normal means it is bad and waiting will not help, which is a
 * different decision from HEAVY + much worse.
 *
 * The previous design showed only the first, against a free-flow baseline, and
 * so read HEAVY on chronically busy corridors at every hour of every day.
 */
export const VS_USUAL: Record<VsUsual, { label: string; tone: 'error' | 'warning' | 'success' | 'textMuted' }> = {
  much_worse: { label: 'Much worse than usual', tone: 'error' },
  worse:      { label: 'Worse than usual',      tone: 'warning' },
  normal:     { label: 'Normal for this time',  tone: 'textMuted' },
  better:     { label: 'Better than usual',     tone: 'success' },
};

/**
 * Minutes above what this road normally takes now — NOT minutes above an empty
 * road. Returns null without a baseline, and 0 or less is not surfaced: "3 min
 * quicker than usual" is noise dressed as information.
 */
export const extraMinutes = (r: LiveRoute): number | null => {
  if (r.duration_seconds == null || r.expected_duration_seconds == null) return null;
  const extra = Math.round((r.duration_seconds - r.expected_duration_seconds) / 60);
  return extra > 0 ? extra : null;
};

/**
 * Ordering within the same severity: the most abnormal first. A corridor that
 * is heavy every Monday at eight is less worth the top slot than one that is
 * heavy today and normally is not.
 *
 * Severity still outranks this, because the first question a city view answers
 * is "which roads are bad" — same principle as severity outranking recency for
 * the narrative reports above.
 */
const VS_USUAL_RANK: Record<VsUsual, number> = {
  much_worse: 3, worse: 2, normal: 1, better: 0,
};

/**
 * A reading older than this is shown as stale. The agent is scheduled hourly
 * and GitHub routinely fires free-tier schedules 3-6h late, so this sits past
 * that on purpose: it should flag a broken pipeline, not an ordinary late run.
 * The reading's real age is always printed beside it regardless — this is the
 * second-level warning, not the only one.
 */
export const LIVE_STALE_MS = 6 * 60 * 60 * 1000;

export const newestLiveAt = (routes: LiveRoute[]): number | null =>
  routes.length ? Math.max(...routes.map(r => new Date(r.updated_at).getTime())) : null;

export const useLiveRoutes = () => {
  const [routes, setRoutes] = useState<LiveRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('traffic_live_routes').select('*');
      if (error || !data) return;

      // Worst first, then most abnormal, then most delayed — the same
      // severity-first rule as the narrative reports, so the two lists read
      // the same way.
      const rank = (r: LiveRoute) => (r.severity ? SEVERITY[r.severity].rank : -1);
      const odd  = (r: LiveRoute) => (r.vs_usual ? VS_USUAL_RANK[r.vs_usual] : -1);
      setRoutes(
        [...(data as LiveRoute[])].sort(
          (a, b) =>
            rank(b) - rank(a) ||
            odd(b) - odd(a) ||
            (extraMinutes(b) ?? 0) - (extraMinutes(a) ?? 0),
        ),
      );
    } catch (err) {
      console.log('Live routes fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { routes, loading, load };
};
