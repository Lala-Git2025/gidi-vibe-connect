import { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  Activity,
  Rocket,
  DollarSign,
  Download,
  RefreshCw,
  Flag,
  Ban,
  CheckCircle2,
  Shield,
  MapPin,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../lib/audit';
import { downloadCsv } from '../lib/csv';
import { MetricCard } from '../components/ui/metric-card';
import { AreaChart, BarChart, DonutChart } from '../components/ui/charts';

interface PlatformStats {
  totalUsers: number;
  totalVenues: number;
  activePromotions: number;
  newUsersThisWeek: number;
  mau: number;
}

// Maps an audit action verb to the icon/colour used in the feed. Unknown
// actions fall back to a neutral shield rather than breaking the render.
const AUDIT_STYLE: Record<string, { Icon: typeof Rocket; color: string }> = {
  promote: { Icon: Rocket, color: '#FB923C' },
  unpromote: { Icon: RefreshCw, color: '#3B82F6' },
  ban: { Icon: Ban, color: '#DC2626' },
  approve: { Icon: CheckCircle2, color: '#16A34A' },
  reject: { Icon: Ban, color: '#DC2626' },
  role_change: { Icon: Shield, color: '#A855F7' },
};

const REPORT_LABEL: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  inappropriate: 'Inappropriate content',
  other: 'Other',
};

// Reports we treat as urgent in the "Action needed" panel.
const HIGH_SEVERITY = new Set(['harassment', 'inappropriate']);

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

// Selectable windows for the growth chart, in days.
const GROWTH_RANGES = [
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
  { key: '12m', days: 365 },
] as const;

type GrowthRangeKey = (typeof GROWTH_RANGES)[number]['key'];

interface TopVenue { label: string; value: number }
interface ReportRow { id: string; who: string; type: string; what: string; sev: string; time: string }
interface AuditRow { who: string; did: string; what: string; time: string; Icon: typeof Rocket; color: string }

const today = new Date();
const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
const monthName = today.toLocaleDateString('en-US', { month: 'long' });
const dayNum = today.getDate();

export default function Overview() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalVenues: 0,
    activePromotions: 0,
    newUsersThisWeek: 0,
    mau: 0,
  });
  const [loading, setLoading] = useState(true);
  const [topVenues, setTopVenues] = useState<TopVenue[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [roles, setRoles] = useState<{ label: string; value: number; color: string }[]>([]);
  const [userGrowth, setUserGrowth] = useState<number[]>(Array(30).fill(0));
  const [growthRange, setGrowthRange] = useState<GrowthRangeKey>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [usersRes, venuesRes, promoRes, newUsersRes, mauRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('venues').select('id', { count: 'exact', head: true }),
        supabase
          .from('venues')
          .select('id', { count: 'exact', head: true })
          .eq('is_promoted', true)
          .gt('promoted_until', new Date().toISOString()),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gt('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gt('updated_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);
      setStats({
        totalUsers: usersRes.count ?? 0,
        totalVenues: venuesRes.count ?? 0,
        activePromotions: promoRes.count ?? 0,
        newUsersThisWeek: newUsersRes.count ?? 0,
        mau: mauRes.count ?? 0,
      });
      setLoading(false);
    }

    // Everything below is independent of the metric cards, so it loads in
    // parallel and each panel degrades to an empty state on its own.
    async function loadPanels() {
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [roleRes, checkInRes, reportRes, auditRes] = await Promise.all([
        supabase.from('profiles').select('role'),
        supabase
          .from('venue_check_ins')
          .select('venue_id')
          .gte('checked_in_at', monthAgo),
        supabase
          .from('post_reports')
          .select('id, reason, post_id, reporter_id, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('admin_audit_log')
          .select('admin_id, action, resource_type, details, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // ── Real role breakdown ─────────────────────────────────────────
      const roleCounts = new Map<string, number>();
      for (const r of roleRes.data ?? []) {
        const key = (r as any).role || 'Consumer';
        roleCounts.set(key, (roleCounts.get(key) ?? 0) + 1);
      }
      const ROLE_COLORS: Record<string, string> = {
        Consumer: '#6B7280',
        'Business Owner': '#EAB308',
        'Content Creator': '#06B6D4',
        Admin: '#FB923C',
        'Super Admin': '#A855F7',
      };
      setRoles(
        [...roleCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([label, value]) => ({ label, value, color: ROLE_COLORS[label] ?? '#9CA3AF' })),
      );

      // ── Top venues by check-ins (last 30d) ──────────────────────────
      const counts = new Map<string, number>();
      for (const row of checkInRes.data ?? []) {
        const id = (row as any).venue_id;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (topIds.length > 0) {
        const { data: venueRows } = await supabase
          .from('venues')
          .select('id, name')
          .in('id', topIds.map(([id]) => id));
        const nameById = new Map((venueRows ?? []).map((v: any) => [v.id, v.name]));
        setTopVenues(
          topIds.map(([id, value]) => ({ label: nameById.get(id) ?? 'Unknown venue', value })),
        );
      } else {
        setTopVenues([]);
      }

      // ── Pending moderation reports ──────────────────────────────────
      const reportRows = reportRes.data ?? [];
      if (reportRows.length > 0) {
        const reporterIds = [...new Set(reportRows.map((r: any) => r.reporter_id))];
        const { data: reporters } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', reporterIds);
        const reporterName = new Map((reporters ?? []).map((p: any) => [p.user_id, p.full_name]));
        setReports(
          reportRows.map((r: any) => ({
            id: r.id,
            who: reporterName.get(r.reporter_id) || 'A user',
            type: REPORT_LABEL[r.reason] ?? r.reason,
            what: `Post ${String(r.post_id).slice(0, 8)}…`,
            sev: HIGH_SEVERITY.has(r.reason) ? 'high' : 'med',
            time: timeAgo(r.created_at),
          })),
        );
      } else {
        setReports([]);
      }

      // ── Admin audit trail ───────────────────────────────────────────
      const auditRows = auditRes.data ?? [];
      if (auditRows.length > 0) {
        const adminIds = [...new Set(auditRows.map((r: any) => r.admin_id).filter(Boolean))];
        const { data: admins } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', adminIds);
        const adminName = new Map((admins ?? []).map((p: any) => [p.user_id, p.full_name]));
        setAuditLog(
          auditRows.map((r: any) => {
            const style = AUDIT_STYLE[r.action] ?? { Icon: Shield, color: '#6B7280' };
            return {
              who: adminName.get(r.admin_id) || 'System',
              did: String(r.action).replace(/_/g, ' '),
              what: r.details?.name || r.details?.target || r.resource_type || '',
              time: timeAgo(r.created_at),
              Icon: style.Icon,
              color: style.color,
            };
          }),
        );
      } else {
        setAuditLog([]);
      }
    }

    load();
    loadPanels();
  }, []);

  // Signup series, re-queried whenever the range chips change.
  useEffect(() => {
    let cancelled = false;
    async function loadGrowth() {
      const days = GROWTH_RANGES.find(r => r.key === growthRange)?.days ?? 30;
      // Long ranges bucket by week so the chart stays readable.
      const bucketDays = days > 90 ? 7 : 1;
      const buckets = Math.ceil(days / bucketDays);

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', start.toISOString());
        if (error) throw error;
        if (cancelled) return;

        const series = Array(buckets).fill(0);
        for (const row of data ?? []) {
          const created = new Date((row as any).created_at).getTime();
          const offset = Math.floor((created - start.getTime()) / 86_400_000 / bucketDays);
          if (offset >= 0 && offset < buckets) series[offset] += 1;
        }
        // Cumulative reads better than daily spikes at low volume.
        let running = 0;
        setUserGrowth(series.map(n => (running += n)));
      } catch (err) {
        console.error('Growth query failed:', err);
        if (!cancelled) setUserGrowth(Array(buckets).fill(0));
      }
    }
    loadGrowth();
    return () => { cancelled = true; };
  }, [growthRange]);

  // trending_venues is a materialized view; pg_cron refreshes it every 10 min,
  // but admins need a manual trigger after promoting a venue.
  const handleRefreshViews = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.rpc('refresh_trending_venues');
      if (error) throw error;
      await logAdminAction('refresh', 'trending_venues', 'materialized_view', {
        name: 'trending_venues',
      });
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Marks a report handled and drops it from the pending panel.
  const handleReviewReport = async (reportId: string) => {
    setReviewingId(reportId);
    try {
      const { error } = await supabase
        .from('post_reports')
        .update({ status: 'reviewed' })
        .eq('id', reportId);
      if (error) throw error;
      await logAdminAction('approve', 'post_report', reportId, { target: 'reviewed' });
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error('Could not update report:', err);
    } finally {
      setReviewingId(null);
    }
  };

  const handleExport = () => {
    downloadCsv('platform-overview', [
      { metric: 'Total users', value: stats.totalUsers },
      { metric: 'Total venues', value: stats.totalVenues },
      { metric: 'Active promotions', value: stats.activePromotions },
      { metric: 'New users this week', value: stats.newUsersThisWeek },
      { metric: 'Monthly active users', value: stats.mau },
      ...roles.map(r => ({ metric: `Users — ${r.label}`, value: r.value })),
      ...topVenues.map(v => ({ metric: `Check-ins (30d) — ${v.label}`, value: v.value })),
    ], ['metric', 'value']);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 22,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="ap-page-eyebrow">
            Platform overview · {dayName} {dayNum} {monthName}
          </div>
          <h1 className="ap-page-title">Lagos at a glance</h1>
          <p className="ap-page-sub">
            {loading
              ? 'Loading platform-wide stats…'
              : `${stats.totalUsers.toLocaleString()} users across ${stats.totalVenues.toLocaleString()} venues. ${stats.newUsersThisWeek} new sign-ups this week.`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ap-btn ap-btn-secondary" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            className="ap-btn ap-btn-secondary"
            onClick={handleRefreshViews}
            disabled={refreshing}
          >
            <RefreshCw className={'h-3.5 w-3.5' + (refreshing ? ' animate-spin' : '')} />
            {refreshing ? 'Refreshing…' : 'Refresh views'}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <MetricCard
          hot
          title="Total users"
          value={loading ? '—' : stats.totalUsers.toLocaleString()}
          delta={stats.newUsersThisWeek > 0 ? `${stats.newUsersThisWeek}` : undefined}
          deltaUp
          sub="new this wk"
          icon={Users}
          sparkline={userGrowth.slice(-12)}
        />
        <MetricCard
          title="MAU"
          value={loading ? '—' : stats.mau.toLocaleString()}
          sub="30-day"
          icon={Activity}
        />
        <MetricCard
          title="Venues"
          value={loading ? '—' : stats.totalVenues.toLocaleString()}
          sub="total"
          icon={Building2}
        />
        <MetricCard
          title="Promoted"
          value={loading ? '—' : stats.activePromotions}
          sub={`/ ${stats.totalVenues} venues`}
          icon={Rocket}
        />
        <MetricCard
          title="Revenue · 30d"
          value="₦4.8M"
          delta="22%"
          deltaUp
          sub="vs prev. 30d"
          icon={DollarSign}
        />
      </div>

      {/* Growth + roles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: 18,
          marginBottom: 18,
        }}
      >
        <div className="ap-card" style={{ padding: 22 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div>
              <div className="ap-section-title">User growth · last 30 days</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                Refreshed every 10 min
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {GROWTH_RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setGrowthRange(r.key)}
                  className={'ap-btn ' + (r.key === growthRange ? 'ap-btn-primary' : 'ap-btn-ghost')}
                  style={{ height: 28, padding: '0 11px', fontSize: 11 }}
                >
                  {r.key}
                </button>
              ))}
            </div>
          </div>
          <AreaChart data={userGrowth} color="#EA580C" />
        </div>
        <div className="ap-card" style={{ padding: 22 }}>
          <div className="ap-section-title" style={{ marginBottom: 16 }}>
            Users by role
          </div>
          <DonutChart data={roles} />
        </div>
      </div>

      {/* Hot row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
        }}
      >
        {/* Top venues */}
        <div className="ap-card" style={{ padding: 22 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div className="ap-section-title">Top venues · check-ins</div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.1em',
                color: '#FB923C',
                textTransform: 'uppercase',
              }}
            >
              Last 24h
            </span>
          </div>
          {topVenues.length > 0 ? (
            <BarChart data={topVenues} color="#FB923C" />
          ) : (
            <div style={{ padding: '28px 4px', fontSize: 13, color: '#9CA3AF' }}>
              No check-ins in the last 30 days yet.
            </div>
          )}
        </div>

        {/* Reports */}
        <div className="ap-card" style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div className="ap-section-title">Open reports</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                3 awaiting moderation
              </div>
            </div>
            <span className="ap-pill ap-pill-danger">
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#DC2626',
                  animation: 'apPulse 1.4s infinite',
                }}
              />
              Action needed
            </span>
          </div>
          {reports.length === 0 && (
            <div style={{ padding: '20px 18px', fontSize: 13, color: '#9CA3AF' }}>
              No pending reports. Content reported from the app appears here.
            </div>
          )}
          {reports.map((r) => (
            <div
              key={r.id}
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: r.sev === 'high' ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
                  color: r.sev === 'high' ? '#DC2626' : '#EA580C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Flag className="h-3.5 w-3.5" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.type}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{r.what}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                  by {r.who} · {r.time} ago
                </div>
              </div>
              <button
                className="ap-btn ap-btn-secondary"
                style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                onClick={() => handleReviewReport(r.id)}
                disabled={reviewingId === r.id}
              >
                {reviewingId === r.id ? 'Saving…' : 'Review'}
              </button>
            </div>
          ))}
        </div>

        {/* Audit log */}
        <div className="ap-card" style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="ap-section-title">Audit log</div>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Last {auditLog.length}</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {auditLog.length === 0 && (
              <div style={{ padding: '16px 18px', fontSize: 12, color: '#9CA3AF' }}>
                No admin actions logged yet.
              </div>
            )}
            {auditLog.map((e, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: e.color + '1A',
                    color: e.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <e.Icon className="h-3 w-3" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                    <strong>{e.who}</strong> <span style={{ color: '#6B7280' }}>{e.did}</span>{' '}
                    <strong>{e.what}</strong>
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{e.time} ago</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="ap-card" style={{ padding: 22, marginTop: 18 }}>
        <div className="ap-section-title" style={{ marginBottom: 14 }}>
          Quick links
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <a
            href="/venues"
            style={{
              padding: 14,
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              background: '#fff',
              textDecoration: 'none',
              color: '#18181B',
            }}
          >
            <Building2 className="h-5 w-5 mb-2" color="#EA580C" />
            <div style={{ fontWeight: 700, fontSize: 14 }}>Venue manager</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
              Promote, flag, or approve venues
            </div>
          </a>
          <a
            href="/users"
            style={{
              padding: 14,
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              background: '#fff',
              textDecoration: 'none',
              color: '#18181B',
            }}
          >
            <Users className="h-5 w-5 mb-2" color="#EA580C" />
            <div style={{ fontWeight: 700, fontSize: 14 }}>User manager</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
              Roles, flags, and audit history
            </div>
          </a>
          <a
            href="/promotions"
            style={{
              padding: 14,
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              background: '#fff',
              textDecoration: 'none',
              color: '#18181B',
            }}
          >
            <Rocket className="h-5 w-5 mb-2" color="#EA580C" />
            <div style={{ fontWeight: 700, fontSize: 14 }}>Promotions</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
              Track all paid trending slots
            </div>
          </a>
          <a
            href="/analytics"
            style={{
              padding: 14,
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              background: '#fff',
              textDecoration: 'none',
              color: '#18181B',
            }}
          >
            <MapPin className="h-5 w-5 mb-2" color="#EA580C" />
            <div style={{ fontWeight: 700, fontSize: 14 }}>Analytics</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
              Deep platform engagement view
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
