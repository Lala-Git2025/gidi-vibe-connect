import { useCallback, useEffect, useState } from 'react';
import { Activity, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

/**
 * Is the platform's background machinery actually running?
 *
 * Every number here is a freshness check rather than a status light, because
 * this project's failures have all been the same shape: a thing that reports
 * success while delivering nothing. The news launchd job failed 53 times over
 * two months while `launchctl` showed it loaded; pg_cron logged "succeeded"
 * for a dispatched request that 401'd; a GitHub schedule asked for 12 runs a
 * day and delivered 4.7. **The only trustworthy signal is the age of the last
 * row a job actually wrote**, so that is what this page reports.
 */

interface Feed {
  key: string;
  label: string;
  detail: string;
  /** Minutes since the newest row. null when the feed has never written. */
  ageMinutes: number | null;
  /** Past this, something is wrong rather than merely late. */
  staleAfterMinutes: number;
  count: number;
}

const newestAge = (iso: string | null | undefined): number | null =>
  iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : null;

const describeAge = (mins: number | null): string => {
  if (mins === null) return 'never';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function Health() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [flags, setFlags] = useState<Array<{ key: string; enabled: boolean; description: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const newest = async (table: string, column: string) => {
      const { data, count } = await supabase
        .from(table)
        .select(column, { count: 'exact' })
        .order(column, { ascending: false })
        .limit(1);
      return {
        at: (data?.[0] as any)?.[column] as string | undefined,
        count: count ?? 0,
      };
    };

    const [traffic, readings, news, events, reports, flagRows] = await Promise.all([
      newest('traffic_live_routes', 'updated_at'),
      newest('traffic_route_readings', 'observed_at'),
      newest('news', 'created_at'),
      newest('events', 'created_at'),
      newest('post_reports', 'created_at'),
      supabase.from('feature_flags').select('key, enabled, description').order('key'),
    ]);

    setFeeds([
      {
        key: 'traffic', label: 'Live traffic (pg_cron)',
        detail: 'Eight corridors, every 15 minutes',
        ageMinutes: newestAge(traffic.at), staleAfterMinutes: 60, count: traffic.count,
      },
      {
        key: 'readings', label: 'Traffic history',
        detail: 'Append-only reading log',
        ageMinutes: newestAge(readings.at), staleAfterMinutes: 60, count: readings.count,
      },
      {
        key: 'news', label: 'Gidi News scraper',
        detail: 'GitHub Actions, hourly (throttled in practice)',
        ageMinutes: newestAge(news.at), staleAfterMinutes: 12 * 60, count: news.count,
      },
      {
        key: 'events', label: 'Events ingestion',
        detail: 'Eventbrite + Meetup JSON-LD, daily',
        ageMinutes: newestAge(events.at), staleAfterMinutes: 48 * 60, count: events.count,
      },
      {
        key: 'reports', label: 'User reports',
        detail: 'Quiet is good here — this is not a job',
        ageMinutes: newestAge(reports.at), staleAfterMinutes: Number.POSITIVE_INFINITY, count: reports.count,
      },
    ]);
    setFlags((flagRows.data ?? []) as any[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusOf = (f: Feed) => {
    if (f.staleAfterMinutes === Number.POSITIVE_INFINITY) return 'idle' as const;
    if (f.ageMinutes === null) return 'never' as const;
    return f.ageMinutes > f.staleAfterMinutes ? 'stale' as const : 'fresh' as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health</h1>
          <p className="text-muted-foreground mt-1">
            Measured by when each job last wrote a row — not by whether it reported success.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Re-check
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Data feeds
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="divide-y">
              {feeds.map(f => {
                const status = statusOf(f);
                return (
                  <div key={f.key} className="py-4 flex items-center gap-4">
                    {status === 'fresh' && <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />}
                    {status === 'stale' && <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />}
                    {status === 'never' && <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />}
                    {status === 'idle' && <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{f.label}</p>
                      <p className="text-sm text-muted-foreground">{f.detail}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-medium ${status === 'stale' || status === 'never' ? 'text-destructive' : ''}`}>
                        {describeAge(f.ageMinutes)}
                      </p>
                      <p className="text-xs text-muted-foreground">{f.count.toLocaleString()} rows</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Feature flags</CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flags configured.</p>
          ) : (
            <div className="divide-y">
              {flags.map(f => (
                <div key={f.key} className="py-2.5 flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${f.enabled ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono">{f.key}</p>
                    {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {f.enabled ? 'on' : 'off'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Flags are toggled from Settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
