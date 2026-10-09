import { useCallback, useEffect, useState } from 'react';
import { Shield, Loader2, Download, Rocket, UserCog, Check, X, EyeOff, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';
import { downloadCsv } from '../lib/csv';

/**
 * Reads back `admin_audit_log`.
 *
 * `logAdminAction` has been writing to this table from four call sites — role
 * changes, promotions, report decisions, trending refreshes — and **nothing in
 * the product could read any of it**. An audit trail nobody can inspect is a
 * log file on a disk you have no shell for: it satisfies the letter of
 * accountability and none of its purpose.
 *
 * Deliberately read-only. There is no delete, no edit and no bulk action: an
 * audit log an admin can rewrite is not one.
 */

interface AuditRow {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  adminName?: string;
}

const ACTION_STYLE: Record<string, { icon: typeof Shield; tone: string }> = {
  promote:     { icon: Rocket,  tone: 'text-primary' },
  unpromote:   { icon: Rocket,  tone: 'text-muted-foreground' },
  role_change: { icon: UserCog, tone: 'text-blue-600' },
  approve:     { icon: Check,   tone: 'text-green-600' },
  reject:      { icon: X,       tone: 'text-destructive' },
  dismiss:     { icon: X,       tone: 'text-muted-foreground' },
  review:      { icon: Check,   tone: 'text-blue-600' },
  hide_post:   { icon: EyeOff,  tone: 'text-destructive' },
  unhide_post: { icon: EyeOff,  tone: 'text-muted-foreground' },
  refresh:     { icon: RefreshCw, tone: 'text-muted-foreground' },
};

const PAGE = 50;

export default function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('admin_audit_log')
      .select('id, admin_id, action, resource_type, resource_id, details, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);

    const term = search.trim();
    // Commas split PostgREST's or() filter list, so they are stripped rather
    // than escaped — there is no escape syntax for the separator.
    if (term) {
      const safe = term.replace(/[,%*()]/g, ' ').trim();
      if (safe) query = query.or(`action.ilike.%${safe}%,resource_type.ilike.%${safe}%`);
    }

    const { data, count } = await query;
    const list = (data ?? []) as AuditRow[];

    if (list.length > 0) {
      const adminIds = [...new Set(list.map(r => r.admin_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles').select('user_id, full_name').in('user_id', adminIds);
      const names = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
      for (const r of list) r.adminName = names.get(r.admin_id) ?? 'Unknown admin';
    }

    setRows(list);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    downloadCsv(
      `admin-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map(r => ({
        when: r.created_at,
        admin: r.adminName ?? r.admin_id,
        action: r.action,
        resource_type: r.resource_type,
        resource_id: r.resource_id ?? '',
        details: JSON.stringify(r.details ?? {}),
      })),
    );
  };

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit log</h1>
          <p className="text-muted-foreground mt-1">
            Every admin action on the platform. Read-only by design.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export page
        </Button>
      </div>

      <Input
        placeholder="Filter by action or resource type…"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }}
        className="max-w-sm"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {loading ? 'Loading…' : `${total.toLocaleString()} entr${total === 1 ? 'y' : 'ies'}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search
                  ? 'No entries match that filter.'
                  : 'No admin actions recorded yet. Promoting a venue or changing a role writes here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {rows.map(r => {
                const style = ACTION_STYLE[r.action] ?? { icon: Shield, tone: 'text-muted-foreground' };
                const Icon = style.icon;
                return (
                  <div key={r.id} className="py-3 flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${style.tone}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{r.adminName}</span>
                        {' '}
                        <span className="text-muted-foreground">{r.action.replace(/_/g, ' ')}</span>
                        {' '}
                        <span className="font-medium">{r.resource_type.replace(/_/g, ' ')}</span>
                      </p>
                      {r.details && Object.keys(r.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-all">
                          {Object.entries(r.details)
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                            .join(' · ')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(r.created_at).toLocaleString()}
                        {r.resource_id ? ` · ${r.resource_id.slice(0, 8)}…` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t">
              <span className="text-sm text-muted-foreground">Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
