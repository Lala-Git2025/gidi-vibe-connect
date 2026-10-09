import { useCallback, useEffect, useState } from 'react';
import { MessagesSquare, Loader2, Eye, EyeOff, Users, FileText, Lock, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../lib/audit';

/**
 * The eight communities, their real membership, and a switch to retire one.
 *
 * `member_count` and `post_count` are cached columns kept in sync by triggers.
 * They are shown here rather than recounted because that is the whole reason
 * they exist — but note the history: these were seeded with ~9,800 invented
 * members against 5 real ones until migration 20260915033205 recomputed them.
 * If a number here looks implausible, suspect the cache before the UI.
 */

interface CommunityRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  member_count: number;
  post_count: number;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
}

export default function CommunitiesManager() {
  const [rows, setRows] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('communities')
      .select('id, name, description, icon, color, member_count, post_count, is_public, is_active, created_at')
      .order('member_count', { ascending: false });
    setRows((data ?? []) as CommunityRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (c: CommunityRow) => {
    setBusyId(c.id);
    try {
      await supabase.from('communities').update({ is_active: !c.is_active }).eq('id', c.id);
      await logAdminAction(c.is_active ? 'retire_community' : 'restore_community', 'community', c.id, {
        name: c.name,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const totalMembers = rows.reduce((sum, c) => sum + (c.member_count || 0), 0);
  const totalPosts = rows.reduce((sum, c) => sum + (c.post_count || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Communities</h1>
        <p className="text-muted-foreground mt-1">
          Membership and activity across every community in the app.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Communities</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{loading ? '—' : rows.filter(c => c.is_active).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total members</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{loading ? '—' : totalMembers.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total posts</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{loading ? '—' : totalPosts.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary" />
            All communities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <MessagesSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No communities yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {rows.map(c => (
                <div key={c.id} className={`py-4 flex items-center gap-4 ${c.is_active ? '' : 'opacity-60'}`}>
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: c.color ?? '#F3F4F6' }}
                  >
                    {c.icon ?? '•'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{c.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
                        {c.is_public ? <><Globe className="h-3 w-3" /> public</> : <><Lock className="h-3 w-3" /> private</>}
                      </span>
                      {!c.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">retired</span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground truncate">{c.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{c.member_count.toLocaleString()}</span>
                      <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{c.post_count.toLocaleString()}</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === c.id}
                    onClick={() => toggleActive(c)}
                    className="flex-shrink-0"
                  >
                    {busyId === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : c.is_active ? (
                      <><EyeOff className="h-3 w-3 mr-1" /> Retire</>
                    ) : (
                      <><Eye className="h-3 w-3 mr-1" /> Restore</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
