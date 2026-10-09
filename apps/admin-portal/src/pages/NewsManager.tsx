import { useCallback, useEffect, useState } from 'react';
import { Newspaper, Loader2, Eye, EyeOff, ExternalLink, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../lib/audit';

/**
 * Oversight of the Gidi News feed.
 *
 * ~38,500 rows and growing hourly, so this page never tries to show the
 * archive — it shows the window the app actually reads (the last 24 hours,
 * since NewsScreen's MAX_AGE_HOURS became 24) plus a search across everything.
 * An admin list that paginates 38,500 rows is a list nobody uses.
 *
 * `is_active` is the kill switch: the consumer feed filters on it, so flipping
 * it here pulls a story out of the app immediately and reversibly.
 */

interface NewsRow {
  id: string;
  title: string;
  gidi_headline: string | null;
  brief: string | null;
  summary: string | null;
  source: string | null;
  gidi_category: string | null;
  relevance: number | null;
  publish_date: string;
  external_url: string | null;
  is_active: boolean;
  duplicate_of: string | null;
}

type Scope = 'live' | 'uncurated' | 'low_relevance' | 'hidden';

const SCOPES: Array<{ key: Scope; label: string; hint: string }> = [
  { key: 'live',           label: 'In the app',     hint: 'Last 24h, active, not a duplicate' },
  { key: 'uncurated',      label: 'Awaiting Gidi',  hint: 'The editor agent has not reached these' },
  { key: 'low_relevance',  label: 'Below the floor', hint: 'Scored under 30 — hidden from the feed' },
  { key: 'hidden',         label: 'Switched off',    hint: 'is_active = false' },
];

export default function NewsManager() {
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('live');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();

    let query = supabase
      .from('news')
      .select(
        'id, title, gidi_headline, brief, summary, source, gidi_category, relevance, ' +
        'publish_date, external_url, is_active, duplicate_of',
        { count: 'exact' },
      )
      .order('publish_date', { ascending: false })
      .limit(60);

    const term = search.trim().replace(/[,%*()]/g, ' ').trim();
    if (term) {
      // Search reaches the whole archive on purpose — somebody chasing a
      // specific story needs to find it wherever it is.
      query = query.or(`title.ilike.%${term}%,gidi_headline.ilike.%${term}%`);
    } else if (scope === 'live') {
      query = query.gte('publish_date', dayAgo).eq('is_active', true).is('duplicate_of', null);
    } else if (scope === 'uncurated') {
      query = query.gte('publish_date', dayAgo).is('gidi_headline', null);
    } else if (scope === 'low_relevance') {
      query = query.gte('publish_date', dayAgo).lt('relevance', 30);
    } else {
      query = query.eq('is_active', false);
    }

    const { data, count } = await query;
    setRows((data ?? []) as unknown as NewsRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [scope, search]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (row: NewsRow) => {
    setBusyId(row.id);
    try {
      await supabase.from('news').update({ is_active: !row.is_active }).eq('id', row.id);
      await logAdminAction(row.is_active ? 'hide_news' : 'unhide_news', 'news', row.id, {
        title: row.gidi_headline ?? row.title,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const activeScope = SCOPES.find(s => s.key === scope);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">News feed</h1>
        <p className="text-muted-foreground mt-1">
          What Gidi News is showing, and what it is holding back. Switching a story off removes it
          from the app immediately.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {SCOPES.map(s => (
          <Button
            key={s.key}
            size="sm"
            variant={scope === s.key && !search ? 'default' : 'outline'}
            onClick={() => { setScope(s.key); setSearch(''); }}
          >
            {s.label}
          </Button>
        ))}
        <Input
          placeholder="Search all 38k headlines…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs ml-auto"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            {loading
              ? 'Loading…'
              : search
                ? `${total.toLocaleString()} matching “${search.trim()}”`
                : `${total.toLocaleString()} · ${activeScope?.hint}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nothing here right now.</p>
            </div>
          ) : (
            <div className="divide-y">
              {rows.map(n => (
                <div key={n.id} className="py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{n.gidi_headline ?? n.title}</p>
                      {n.gidi_headline && (
                        <span title="Rewritten by the Gidi editor agent">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </span>
                      )}
                      {n.gidi_category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {n.gidi_category}
                        </span>
                      )}
                      {n.relevance != null && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            n.relevance >= 30 ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {n.relevance}
                        </span>
                      )}
                      {!n.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">off</span>
                      )}
                      {n.duplicate_of && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          duplicate
                        </span>
                      )}
                    </div>
                    {(n.brief || n.summary) && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {n.brief ?? n.summary}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {n.source ?? 'Unknown source'} · {new Date(n.publish_date).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {n.external_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Read the original"
                        onClick={() => window.open(n.external_url!, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === n.id}
                      onClick={() => toggleActive(n)}
                    >
                      {busyId === n.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : n.is_active ? (
                        <><EyeOff className="h-3 w-3 mr-1" /> Switch off</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" /> Switch on</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
