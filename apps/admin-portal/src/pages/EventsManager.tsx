import { useCallback, useEffect, useState } from 'react';
import { Calendar, Loader2, Eye, EyeOff, Star, ExternalLink, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../lib/audit';
import { downloadCsv } from '../lib/csv';

/**
 * Platform-wide event oversight.
 *
 * Most events are now ingested automatically from Eventbrite and Meetup
 * (scripts/lagos-events-agent.js), which auto-publish on the strength of the
 * source's own structured data. That is the right default for volume, and it
 * means `is_published` is the only thing standing between a bad listing and
 * every user — so somebody has to be able to flip it without opening the
 * Supabase dashboard. This is that surface.
 *
 * Unpublishing is reversible and is the whole point. There is no delete.
 */

interface EventRow {
  id: string;
  title: string;
  venue_name: string | null;
  location: string | null;
  category: string | null;
  start_date: string;
  source: string;
  external_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_verified: boolean;
  organizer_name: string | null;
}

const SOURCE_STYLE: Record<string, string> = {
  manual: 'bg-blue-100 text-blue-800',
  eventbrite: 'bg-orange-100 text-orange-800',
  meetup: 'bg-red-100 text-red-800',
  scraped: 'bg-muted text-muted-foreground',
  nairabox: 'bg-muted text-muted-foreground',
  tix_africa: 'bg-muted text-muted-foreground',
};

type Scope = 'upcoming' | 'unpublished' | 'past' | 'all';

const PAGE = 25;

export default function EventsManager() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('upcoming');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const nowIso = new Date().toISOString();

    let query = supabase
      .from('events')
      .select(
        'id, title, venue_name, location, category, start_date, source, external_url, ' +
        'is_published, is_featured, is_verified, organizer_name',
        { count: 'exact' },
      )
      .order('start_date', { ascending: scope !== 'past' })
      .range(page * PAGE, page * PAGE + PAGE - 1);

    if (scope === 'upcoming') query = query.gte('start_date', nowIso).eq('is_published', true);
    else if (scope === 'unpublished') query = query.eq('is_published', false);
    else if (scope === 'past') query = query.lt('start_date', nowIso);

    const term = search.trim().replace(/[,%*()]/g, ' ').trim();
    if (term) query = query.or(`title.ilike.%${term}%,venue_name.ilike.%${term}%`);

    const { data, count } = await query;
    setRows((data ?? []) as unknown as EventRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [scope, search, page]);

  useEffect(() => { load(); }, [load]);

  const update = async (ev: EventRow, patch: Partial<EventRow>, action: string) => {
    setBusyId(ev.id);
    try {
      await supabase.from('events').update(patch).eq('id', ev.id);
      await logAdminAction(action, 'event', ev.id, { title: ev.title, source: ev.source });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = () => {
    downloadCsv(
      `events-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map(e => ({
        title: e.title,
        starts: e.start_date,
        venue: e.venue_name ?? '',
        location: e.location ?? '',
        category: e.category ?? '',
        source: e.source,
        published: e.is_published ? 'yes' : 'no',
        featured: e.is_featured ? 'yes' : 'no',
        organizer: e.organizer_name ?? '',
        url: e.external_url ?? '',
      })),
    );
  };

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground mt-1">
            Every event on the platform, including the ones ingested automatically.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Export page
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {(['upcoming', 'unpublished', 'past', 'all'] as Scope[]).map(s => (
          <Button
            key={s}
            size="sm"
            variant={scope === s ? 'default' : 'outline'}
            onClick={() => { setScope(s); setPage(0); }}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
        <Input
          placeholder="Search title or venue…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="max-w-xs ml-auto"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {loading ? 'Loading…' : `${total.toLocaleString()} event${total === 1 ? '' : 's'}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No events match this view.</p>
            </div>
          ) : (
            <div className="divide-y">
              {rows.map(e => (
                <div key={e.id} className="py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate max-w-md">{e.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_STYLE[e.source] ?? 'bg-muted text-muted-foreground'}`}>
                        {e.source}
                      </span>
                      {!e.is_published && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          unpublished
                        </span>
                      )}
                      {e.is_featured && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          featured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(e.start_date).toLocaleString('en-NG', {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
                      })}
                      {e.venue_name ? ` · ${e.venue_name}` : ''}
                    </p>
                    {e.organizer_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">by {e.organizer_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {e.external_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Open source listing"
                        onClick={() => window.open(e.external_url!, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === e.id}
                      title={e.is_featured ? 'Remove featured' : 'Feature this event'}
                      onClick={() => update(e, { is_featured: !e.is_featured }, e.is_featured ? 'unfeature' : 'feature')}
                    >
                      <Star className={`h-3.5 w-3.5 ${e.is_featured ? 'fill-current text-primary' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === e.id}
                      onClick={() => update(e, { is_published: !e.is_published }, e.is_published ? 'unpublish' : 'publish')}
                    >
                      {busyId === e.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : e.is_published ? (
                        <><EyeOff className="h-3 w-3 mr-1" /> Unpublish</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" /> Publish</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t">
              <span className="text-sm text-muted-foreground">Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
