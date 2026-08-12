import { useNavigate } from 'react-router-dom';
import { Building2, Eye, Calendar, MapPin, Rocket, Download } from 'lucide-react';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { useVenueStats, useWeeklyViews, useVenueActivity } from '../hooks/useVenues';
import { useEventStats } from '../hooks/useEvents';
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
          <button className="bp2-btn bp2-btn-secondary">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button className="bp2-btn bp2-btn-primary" onClick={() => navigate('/venues/new')}>
            <Rocket className="h-3.5 w-3.5" />
            Promote a venue
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
          sparkline={[180, 210, 260, 240, 300, 360, 420, 520, 610, 720, 820, 880]}
        />
        <StatCard
          title="Check-ins"
          value="612"
          delta="18%"
          deltaUp
          sub="vs last week"
          icon={MapPin}
          sparkline={[34, 42, 50, 68, 82, 96, 114, 140, 168, 196, 220, 250]}
        />
        <StatCard
          title="Active events"
          value={loadingEventStats ? '—' : eventStats?.upcomingEvents || 0}
          delta="50%"
          deltaUp
          sub="upcoming"
          icon={Calendar}
          sparkline={[1, 1, 2, 2, 2, 3, 3, 3]}
        />
        <StatCard
          title="Total venues"
          value={loadingVenueStats ? '—' : venueStats?.totalVenues || 0}
          sub={`of ${maxVenues} on ${tier}`}
          icon={Building2}
          sparkline={[3, 3, 4, 4, 4, 5, 5]}
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
