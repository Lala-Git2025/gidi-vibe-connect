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
export const verdict = (reports: TrafficReport[]): string => {
  if (reports.length === 0) return '';
  const blocked = reports.filter(r => r.severity === 'closed').length;
  const heavy   = reports.filter(r => r.severity === 'critical' || r.severity === 'heavy').length;
  const slow    = reports.filter(r => r.severity === 'moderate').length;
  const moving  = reports.filter(r => r.severity === 'light').length;

  return [
    blocked && `${blocked} closed`,
    heavy   && `${heavy} heavy`,
    slow    && `${slow} slow`,
    moving  && `${moving} moving`,
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
