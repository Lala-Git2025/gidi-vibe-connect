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
import { MetricCard } from '../components/ui/metric-card';
import { AreaChart, BarChart, DonutChart } from '../components/ui/charts';

interface PlatformStats {
  totalUsers: number;
  totalVenues: number;
  activePromotions: number;
  newUsersThisWeek: number;
  mau: number;
}

const TOP_VENUES = [
  { label: 'Quilox',              value: 689 },
  { label: 'Sip & Smoke Lounge',  value: 412 },
  { label: 'Hard Rock Lekki',     value: 238 },
  { label: 'Cocoon Lounge',       value: 124 },
  { label: 'Tarragon',            value: 64 },
];

const REPORTS = [
  { id: 'r1', who: 'Adaeze O.', type: 'Inappropriate content', what: 'Vibe post by @clubking_ng', sev: 'high', time: '12m' },
  { id: 'r2', who: 'Kola D.',    type: 'Fake venue listing',    what: 'Cocoon Lounge (duplicate)', sev: 'med',  time: '38m' },
  { id: 'r3', who: 'Anonymous',  type: 'Harassment',            what: '@vibechecker23',            sev: 'high', time: '1h' },
];

const AUDIT_LOG = [
  { who: 'Eze Okafor', did: 'promoted',     what: 'Quilox',                 time: '4m',  Icon: Rocket,         color: '#FB923C' },
  { who: 'Sade Bello', did: 'banned user',  what: '@spammer_07',            time: '22m', Icon: Ban,            color: '#DC2626' },
  { who: 'Eze Okafor', did: 'approved',     what: 'The Library Bar',        time: '1h',  Icon: CheckCircle2,   color: '#16A34A' },
  { who: 'Tunde A.',   did: 'changed role', what: '@new_admin_jen',         time: '2h',  Icon: Shield,         color: '#A855F7' },
  { who: 'System',     did: 'refreshed',    what: 'trending_venues view',   time: '3h',  Icon: RefreshCw,      color: '#3B82F6' },
];

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
    load();
  }, []);

  // Synthetic growth chart for now (real timeseries plugs in later)
  const sparkBase = Math.max(stats.totalUsers, 100);
  const userGrowth = Array.from({ length: 30 }, (_, i) =>
    Math.round(sparkBase * (0.4 + (i / 29) * 0.6))
  );

  const roles = [
    { label: 'Users',       value: Math.max(0, stats.totalUsers - 100), color: '#6B7280' },
    { label: 'Business',    value: 48, color: '#EAB308' },
    { label: 'Admin',       value: 12, color: '#FB923C' },
    { label: 'Super Admin', value: 4,  color: '#A855F7' },
  ];

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
          <button className="ap-btn ap-btn-secondary">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button className="ap-btn ap-btn-secondary">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh views
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
              {['7d', '30d', '90d', '12m'].map((r) => (
                <button
                  key={r}
                  className={'ap-btn ' + (r === '30d' ? 'ap-btn-primary' : 'ap-btn-ghost')}
                  style={{ height: 28, padding: '0 11px', fontSize: 11 }}
                >
                  {r}
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
          <BarChart data={TOP_VENUES} color="#FB923C" />
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
          {REPORTS.map((r) => (
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
              >
                Review
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
            <button
              className="ap-btn ap-btn-ghost"
              style={{ height: 28, padding: '0 10px', fontSize: 12 }}
            >
              View all →
            </button>
          </div>
          <div style={{ padding: '4px 0' }}>
            {AUDIT_LOG.map((e, i) => (
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
