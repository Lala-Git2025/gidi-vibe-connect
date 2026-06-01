// Dashboard — composed dashboard with KPIs, weekly views chart, promotions,
// activity feed.

const WEEKLY_VIEWS    = [240, 280, 320, 380, 420, 580, 640];
const WEEKLY_VIEWS_PREV = [200, 220, 260, 250, 300, 360, 420];

const PROMOTIONS = [
  { name: 'Cocoon Lounge', badge: 'Featured · Trending Tonight', days: 4 },
  { name: 'Sip & Smoke',   badge: 'Sponsored · Top of Explore',  days: 11 },
];

const ACTIVITY = [
  { who: 'Adaeze O.', verb: 'checked in at',          what: 'Cocoon Lounge',           time: '8m', icon: 'map-pin',       color: '#22C55E' },
  { who: 'Tunde M.',  verb: "RSVP'd to",              what: 'Detty December Warm-up',   time: '14m', icon: 'calendar-plus', color: '#3B82F6' },
  { who: 'Bisi K.',   verb: 'posted a vibe at',       what: 'Sip & Smoke',              time: '22m', icon: 'camera',        color: '#A855F7' },
  { who: 'Femi A.',   verb: 'left a 5★ review for',   what: 'Tarragon',                 time: '1h',  icon: 'star',          color: '#EAB308' },
  { who: 'Ifeoma N.', verb: 'shared',                 what: 'your event link',          time: '2h',  icon: 'share-2',       color: '#10B981' },
];

function PromotionsPanel() {
  return (
    <div className="bp2-card" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: '18px 20px', borderBottom: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div className="bp2-section-title">Active promotions</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>2 boosting · auto-renews monthly</div>
        </div>
        <span className="bp2-pill bp2-pill-gold">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#18181B', animation: 'bp2Pulse 1.4s infinite' }}></span>
          Live
        </span>
      </div>
      <div>
        {PROMOTIONS.map((p) => (
          <div key={p.name} style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #F3F4F6',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{p.badge}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#A16207' }}>{p.days} days left</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Auto-renews</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '14px 20px', background: '#FAFAFA' }}>
        <button className="bp2-btn bp2-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
          <Icon name="rocket" size={14} />
          Promote another venue
        </button>
      </div>
    </div>
  );
}

function ActivityPanel() {
  return (
    <div className="bp2-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="bp2-section-title">Recent activity</div>
        <button className="bp2-btn bp2-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: 12 }}>View all →</button>
      </div>
      <div style={{ padding: '6px 0' }}>
        {ACTIVITY.map((a, i) => (
          <div key={i} style={{
            padding: '12px 20px', display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: a.color + '1A', color: a.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name={a.icon} size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <strong>{a.who}</strong>
                <span style={{ color: '#6B7280' }}> {a.verb} </span>
                <strong>{a.what}</strong>
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{a.time} ago</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 }}>
        <div>
          <div className="bp2-page-eyebrow">Dashboard · Friday 14 November</div>
          <h1 className="bp2-page-title">Welcome back, Tunde 👋</h1>
          <p className="bp2-page-sub">Cocoon Lounge had a strong week — check-ins are up <strong style={{ color: '#16A34A' }}>↑ 18%</strong> versus last week and your weekend RSVPs already match last month's total.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bp2-btn bp2-btn-secondary">
            <Icon name="download" size={14} />
            Export
          </button>
          <button className="bp2-btn bp2-btn-primary">
            <Icon name="rocket" size={14} />
            Promote a venue
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard hero title="Profile views"  value="8,420" delta="12%" deltaUp sub="vs last 30 days"  icon="eye"      sparkline={[180,210,260,240,300,360,420,520,610,720,820,880]} />
        <StatCard      title="Check-ins"       value="612"   delta="18%" deltaUp sub="vs last week"    icon="map-pin"  sparkline={[34,42,50,68,82,96,114,140,168,196,220,250]} />
        <StatCard      title="Active events"   value="3"     delta="50%" deltaUp sub="1 sold out"      icon="calendar" sparkline={[1,1,2,2,2,3,3,3]} />
        <StatCard      title="Total venues"    value="5"     sub="of 25 on Premium"                    icon="building-2" sparkline={[3,3,4,4,4,5,5]} />
      </div>

      {/* Body two-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* Left: weekly views chart + promotions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="bp2-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div className="bp2-section-title">Weekly profile views</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Across all your venues · this week vs. last week</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 3, background: '#EAB308', borderRadius: 2 }}></span>
                  <span style={{ color: '#3F3F46', fontWeight: 600 }}>This week</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 3, background: '#9CA3AF', borderRadius: 2, opacity: 0.6 }}></span>
                  <span style={{ color: '#6B7280' }}>Last week</span>
                </div>
              </div>
            </div>
            <AreaChart data={WEEKLY_VIEWS} secondary={WEEKLY_VIEWS_PREV} color="#EAB308" />
          </div>

          <PromotionsPanel />
        </div>

        {/* Right: activity */}
        <ActivityPanel />
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
