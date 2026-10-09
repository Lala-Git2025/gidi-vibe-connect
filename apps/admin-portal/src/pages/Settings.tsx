import { useCallback, useEffect, useState } from 'react';
import { Settings as SettingsIcon, Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { logAdminAction } from '../lib/audit';

/**
 * Platform settings — in practice, the `feature_flags` table.
 *
 * These are the runtime kill switches the agent runner checks before every
 * invocation: `agents.master_enabled`, the per-agent flags, and
 * `agents.daily_cost_cap_usd`. They were only changeable through the Supabase
 * dashboard, which means the person most likely to need the kill switch in a
 * hurry had the slowest route to it.
 *
 * Toggling is restricted to Super Admin here AND in RLS. The client check is
 * an affordance; the policy is the boundary.
 */

interface Flag {
  key: string;
  enabled: boolean;
  value: Record<string, unknown> | null;
  description: string | null;
  updated_at: string | null;
}

export default function Settings() {
  const { profile } = useAdminAuth();
  const isSuperAdmin = profile?.role === 'Super Admin';

  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feature_flags')
      .select('key, enabled, value, description, updated_at')
      .order('key');
    setFlags((data ?? []) as Flag[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (flag: Flag) => {
    setBusyKey(flag.key);
    setError(null);
    try {
      const next = !flag.enabled;
      const { error: err } = await supabase
        .from('feature_flags')
        .update({ enabled: next, updated_at: new Date().toISOString() })
        .eq('key', flag.key);

      if (err) {
        // Almost always RLS refusing a non-Super-Admin. Say so plainly rather
        // than leaving the switch looking broken.
        setError(`Could not change ${flag.key}: ${err.message}`);
        return;
      }
      await logAdminAction(next ? 'enable_flag' : 'disable_flag', 'feature_flag', flag.key, {
        key: flag.key, enabled: next,
      });
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Runtime switches for the platform's background agents.
        </p>
      </div>

      {!isSuperAdmin && (
        <Card className="border-yellow-500/30 bg-yellow-50/50">
          <CardContent className="py-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Read-only for your role</p>
              <p className="text-sm text-muted-foreground">
                Feature flags can be changed by Super Admins. You can see current state here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            Feature flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : flags.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No flags configured.
            </p>
          ) : (
            <div className="divide-y">
              {flags.map(f => (
                <div key={f.key} className="py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium">{f.key}</p>
                    {f.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{f.description}</p>
                    )}
                    {f.value && Object.keys(f.value).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {JSON.stringify(f.value)}
                      </p>
                    )}
                    {f.updated_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        changed {new Date(f.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-medium ${f.enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {f.enabled ? 'ON' : 'OFF'}
                    </span>
                    <Button
                      size="sm"
                      variant={f.enabled ? 'outline' : 'default'}
                      disabled={!isSuperAdmin || busyKey === f.key}
                      onClick={() => toggle(f)}
                    >
                      {busyKey === f.key
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : f.enabled ? 'Turn off' : 'Turn on'}
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
