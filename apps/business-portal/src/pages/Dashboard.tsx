import { useNavigate } from 'react-router-dom';
import { Building2, Eye, Calendar, MapPin, Rocket, Download } from 'lucide-react';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import {
  useVenueStats,
  useWeeklyViews,
  useVenueActivity,
  useCheckInStats,
  useVenueGrowth,
} from '../hooks/useVenues';
import { useEventStats } from '../hooks/useEvents';
import { downloadCsv, datedFilename } from '../lib/csv';
import { StatCard } from '../components/ui/stat-card';
import { AreaChart } from '../components/ui/charts';

// Compact relative time for the activity feed ("8m", "3h", "2d").
function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

const today = new Date();
const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
const monthName = today.toLocaleDateString('en-US', { month: 'long' });
const dayNum = today.getDate();

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, subscription } = useBusinessAuth();
  const { data: venueStats, isLoading: loadingVenueStats } = useVenueStats();
  const { data: eventStats, isLoading: loadingEventStats } = useEventStats();
  const { data: weeklyViews } = useWeeklyViews();
  const { data: activity, isLoading: loadingActivity } = useVenueActivity();
  const { data: checkIns, isLoading: loadingCheckIns } = useCheckInStats();
  const { data: venueGrowth } = useVenueGrowth();

  /**
   * Export the figures actually on this page. A sparkline a reader cannot get
   * the numbers out of is the reason this button existed in the first place.
   */
  const handleExport = () => {
    const current = weeklyViews?.current ?? [];
    const checkSeries = checkIns?.series ?? [];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });

    downloadCsv(
      datedFilename('gidi-dashboard'),
      [
        { header: 'Date', value: (r: { date: string }) => r.date },
        { header: 'Profile views', value: (r: any) => r.views },
        { header: 'Check-ins', value: (r: any) => r.checkIns },
      ],
      days.map((date, i) => ({ date, views: current[i] ?? 0, checkIns: checkSeries[i] ?? 0 })),
    );
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const maxVenues = subscription?.max_venues || 1;
  const tier = subscription?.tier || 'Free';

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 26,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="bp2-page-eyebrow">
            Dashboard · {dayName} {dayNum} {monthName}
          </div>
          <h1 className="bp2-page-title">Welcome back, {firstName} 👋</h1>
          <p className="bp2-page-sub">
            Here's your venue performance at a glance. Track views, check-ins, and engagement
            across all your Lagos venues.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bp2-btn bp2-btn-secondary" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          {/*
            Was labelled "Promote a venue" and navigated to /venues/new, which
            is where you add one. Promotion is an admin-granted flag, so the
            honest destination for an owner is the plan that includes it.
          */}
          <button className="bp2-btn bp2-btn-primary" onClick={() => navigate('/subscription')}>
            <Rocket className="h-3.5 w-3.5" />
            Get promoted
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <StatCard
          hero
          title="Profile views"
          value={loadingVenueStats ? '—' : (venueStats?.totalViews || 0).toLocaleString()}
          sub="Last 30 days"
          icon={Eye}
          sparkline={weeklyViews?.current}
        />
        {/*
          Every figure on this row now comes from the database. The check-ins
          card read value="612" with delta="18%" and a twelve-point sparkline,
          none of which existed anywhere — the whole table holds five rows. A
          fabricated number on an owner's own dashboard is worse than a zero:
          zero sends them out to get customers, 612 tells them they already have.

          `delta` and `sparkline` are optional on StatCard, so a card with no
          real series simply does not draw one rather than inventing a shape.
        */}
        <StatCard
          title="Check-ins"
          value={loadingCheckIns ? '—' : (checkIns?.total ?? 0).toLocaleString()}
          delta={checkIns?.deltaPct != null ? `${Math.abs(checkIns.deltaPct)}%` : undefined}
          deltaUp={(checkIns?.deltaPct ?? 0) >= 0}
          sub={checkIns?.deltaPct != null ? 'vs last week' : 'last 7 days'}
          icon={MapPin}
          sparkline={checkIns?.series}
        />
        <StatCard
          title="Active events"
          value={loadingEventStats ? '—' : eventStats?.upcomingEvents || 0}
          sub="upcoming"
          icon={Calendar}
        />
        <StatCard
          title="Total venues"
          value={loadingVenueStats ? '—' : venueStats?.totalVenues || 0}
          sub={`of ${maxVenues} on ${tier}`}
          icon={Building2}
          sparkline={venueGrowth}
        />
      </div>

      {/* Body two-col */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 20,
        }}
        className="dashboard-grid"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="bp2-card" style={{ padding: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <div>
                <div className="bp2-section-title">Weekly profile views</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  Across all your venues · this week vs. last week
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      width: 10,
                      height: 3,
                      background: '#EAB308',
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: '#3F3F46', fontWeight: 600 }}>This week</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      width: 10,
                      height: 3,
                      background: '#9CA3AF',
                      borderRadius: 2,
                      opacity: 0.6,
                    }}
                  />
                  <span style={{ color: '#6B7280' }}>Last week</span>
                </div>
              </div>
            </div>
            <AreaChart
              data={weeklyViews?.current ?? Array(7).fill(0)}
              secondary={weeklyViews?.previous ?? Array(7).fill(0)}
              color="#EAB308"
            />
          </div>

          {/* Quick actions */}
          <div className="bp2-card" style={{ padding: 24 }}>
            <div className="bp2-section-title" style={{ marginBottom: 16 }}>
              Quick actions
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
              }}
            >
              <button
                onClick={() => navigate('/venues/new')}
                style={{
                  padding: 14,
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <Building2 className="h-5 w-5 mb-2" color="#EAB308" />
                <div style={{ fontWeight: 700, fontSize: 14 }}>Add venue</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                  Create a new listing
                </div>
              </button>
              <button
                onClick={() => navigate('/events/new')}
                style={{
                  padding: 14,
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <Calendar className="h-5 w-5 mb-2" color="#EAB308" />
                <div style={{ fontWeight: 700, fontSize: 14 }}>Create event</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                  Add an upcoming event
                </div>
              </button>
              <button
                onClick={() => navigate(subscription?.can_create_offers ? '/offers' : '/subscription')}
                style={{
                  padding: 14,
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <Rocket className="h-5 w-5 mb-2" color="#EAB308" />
                <div style={{ fontWeight: 700, fontSize: 14 }}>Promote</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                  {subscription?.can_create_offers ? 'Boost a venue' : 'Premium required'}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: activity */}
        <div className="bp2-card" style={{ overflow: 'hidden', alignSelf: 'flex-start' }}>
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="bp2-section-title">Recent activity</div>
            <button
              className="bp2-btn bp2-btn-ghost"
              style={{ height: 28, padding: '0 10px', fontSize: 12 }}
            >
              View all →
            </button>
          </div>
          <div style={{ padding: '6px 0' }}>
            {loadingActivity ? (
              <div style={{ padding: '20px', fontSize: 13, color: '#9CA3AF' }}>Loading activity…</div>
            ) : (activity ?? []).length === 0 ? (
              <div style={{ padding: '20px', fontSize: 13, color: '#9CA3AF' }}>
                No activity yet. Check-ins, reviews, and RSVPs on your venues and events will show up
                here.
              </div>
            ) : (
              (activity ?? []).map((a, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: a.color + '1A',
                    color: a.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                    <strong>{a.who}</strong>
                    <span style={{ color: '#6B7280' }}> {a.verb} </span>
                    <strong>{a.what}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {timeAgo(a.at)} ago
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upgrade banner */}
      {tier === 'Free' && (
        <div
          className="bp2-card-hero"
          style={{ padding: 22, marginTop: 20, position: 'relative' }}
        >
          <div className="bp2-section-title" style={{ marginBottom: 6 }}>
            Upgrade to Premium
          </div>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, maxWidth: 520 }}>
            Get 3 venues, 50 photos per venue, an analytics dashboard, exclusive offers, and menu
            management.
          </p>
          <button className="bp2-btn bp2-btn-primary" onClick={() => navigate('/subscription')}>
            View Plans
          </button>
        </div>
      )}
    </div>
  );
}
