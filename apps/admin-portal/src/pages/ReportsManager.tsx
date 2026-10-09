import { useCallback, useEffect, useState } from 'react';
import { Flag, Loader2, EyeOff, Eye, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../lib/audit';

/**
 * The moderation queue over `post_reports`.
 *
 * The table has existed since the Play UGC work in August and nothing in the
 * product could read it: the sidebar linked to /reports, no such route existed,
 * and the catch-all bounced the click back to Overview. Reports arrived and
 * were invisible.
 *
 * Hiding is the only destructive action available here and it is reversible —
 * `is_hidden` is a soft flag the consumer feed respects through RLS. Deleting
 * a post is deliberately NOT offered: that is irreversible and belongs behind
 * the agent_proposals review path, per the action-tiering rule in CLAUDE.md.
 */

type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

interface ReportRow {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  reporterName?: string;
  postContent?: string | null;
  postAuthor?: string | null;
  postHidden?: boolean;
}

const REASON_LABEL: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  inappropriate: 'Inappropriate',
  other: 'Other',
};

const STATUS_STYLE: Record<ReportStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  actioned: 'bg-red-100 text-red-800',
  dismissed: 'bg-muted text-muted-foreground',
};

const FILTERS: Array<{ key: 'open' | ReportStatus | 'all'; label: string }> = [
  { key: 'open', label: 'Needs review' },
  { key: 'actioned', label: 'Actioned' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: 'all', label: 'All' },
];

export default function ReportsManager() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | ReportStatus | 'all'>('open');

  const load = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('post_reports')
      .select('id, post_id, comment_id, reporter_id, reason, details, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'open') query = query.in('status', ['pending', 'reviewed']);
    else if (filter !== 'all') query = query.eq('status', filter);

    const { data } = await query;
    const rows = (data ?? []) as ReportRow[];

    if (rows.length > 0) {
      // Resolve reporters and the reported posts in two round trips rather
      // than two per row.
      const reporterIds = [...new Set(rows.map(r => r.reporter_id).filter(Boolean))];
      const postIds = [...new Set(rows.map(r => r.post_id).filter(Boolean))] as string[];

      const [{ data: profiles }, { data: posts }] = await Promise.all([
        reporterIds.length
          ? supabase.from('profiles').select('user_id, full_name').in('user_id', reporterIds)
          : Promise.resolve({ data: [] as any[] }),
        postIds.length
          ? supabase.from('social_posts').select('id, content, user_id, is_hidden').in('id', postIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const names = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
      const postMap = new Map((posts ?? []).map((p: any) => [p.id, p]));

      // Author names may not be in the reporter batch.
      const authorIds = [...new Set((posts ?? []).map((p: any) => p.user_id).filter(Boolean))]
        .filter(id => !names.has(id));
      if (authorIds.length) {
        const { data: authors } = await supabase
          .from('profiles').select('user_id, full_name').in('user_id', authorIds);
        for (const a of (authors ?? []) as any[]) names.set(a.user_id, a.full_name);
      }

      for (const r of rows) {
        r.reporterName = names.get(r.reporter_id) ?? 'Unknown';
        const post = r.post_id ? postMap.get(r.post_id) : null;
        r.postContent = post?.content ?? null;
        r.postAuthor = post ? (names.get(post.user_id) ?? 'Unknown') : null;
        r.postHidden = post?.is_hidden ?? false;
      }
    }

    setReports(rows);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (report: ReportRow, status: ReportStatus, action: string) => {
    setBusyId(report.id);
    try {
      await supabase.from('post_reports').update({ status }).eq('id', report.id);
      await logAdminAction(action, 'post_report', report.id, { reason: report.reason, status });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggleHidden = async (report: ReportRow) => {
    if (!report.post_id) return;
    const next = !report.postHidden;
    setBusyId(report.id);
    try {
      await supabase
        .from('social_posts')
        .update({
          is_hidden: next,
          hidden_reason: next ? `Report: ${report.reason}` : null,
          hidden_at: next ? new Date().toISOString() : null,
        })
        .eq('id', report.post_id);
      await supabase.from('post_reports').update({ status: next ? 'actioned' : 'reviewed' }).eq('id', report.id);
      await logAdminAction(next ? 'hide_post' : 'unhide_post', 'social_post', report.post_id, {
        report_id: report.id, reason: report.reason,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Posts and comments flagged by users. Hiding is reversible; deleting is not offered here.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? 'default' : 'outline'}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === 'open' && pendingCount > 0 && ` (${pendingCount})`}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            {loading ? 'Loading…' : `${reports.length} report${reports.length === 1 ? '' : 's'}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <Flag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {filter === 'open'
                  ? 'Nothing waiting on review. Reports from the app land here.'
                  : 'No reports match this filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {reports.map(r => (
                <div key={r.id} className="py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{REASON_LABEL[r.reason] ?? r.reason}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status]}`}>
                        {r.status}
                      </span>
                      {r.postHidden && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                          hidden
                        </span>
                      )}
                      {r.comment_id && !r.post_id && (
                        <span className="text-xs text-muted-foreground">on a comment</span>
                      )}
                    </div>

                    {r.postContent != null && (
                      <p className="text-sm mt-1.5 line-clamp-3 bg-muted/50 rounded p-2">
                        {r.postContent || <span className="italic text-muted-foreground">(no text — media only)</span>}
                      </p>
                    )}
                    {r.details && (
                      <p className="text-sm text-muted-foreground mt-1.5">“{r.details}”</p>
                    )}

                    <p className="text-xs text-muted-foreground mt-1.5">
                      Reported by {r.reporterName}
                      {r.postAuthor ? ` · post by ${r.postAuthor}` : ''}
                      {' · '}
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {r.post_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => toggleHidden(r)}
                      >
                        {busyId === r.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : r.postHidden ? (
                          <><Eye className="h-3 w-3 mr-1" /> Unhide</>
                        ) : (
                          <><EyeOff className="h-3 w-3 mr-1" /> Hide post</>
                        )}
                      </Button>
                    )}
                    {r.status !== 'dismissed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === r.id}
                        onClick={() => setStatus(r, 'dismissed', 'dismiss')}
                      >
                        <X className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                    )}
                    {r.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === r.id}
                        onClick={() => setStatus(r, 'reviewed', 'review')}
                      >
                        <Check className="h-3 w-3 mr-1" /> Mark reviewed
                      </Button>
                    )}
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
