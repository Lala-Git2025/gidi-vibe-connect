// OverviewPage — platform-wide command center.

function MetricCard({ title, value, delta, deltaUp = true, sub, icon, hot, sparkline }) {
  return (
    <div className={hot ? 'ap-card-hot' : 'ap-card'} style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="ap-eyebrow">{title}</span>
        <span style={{
          width: 30, height: 30, borderRadius: 8,
          background: hot ? 'linear-gradient(135deg,#FB923C,#EA580C)' : '#F3F4F6',
          color: hot ? '#fff' : '#6B7280',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: hot ? '0 0 12px rgba(249,115,22,0.45)' : 'none',
        }}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className={'ap-stat-num' + (hot ? ' orange' : '')}>{value}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 12 }}>
            {delta && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 6px', borderRadius: 999,
                background: deltaUp ? '#DCFCE7' : '#FEE2E2',
                color: deltaUp ? '#166534' : '#991B1B',
                fontWeight: 800,
              }}>
                <Icon name={deltaUp ? 'trending-up' : 'trending-down'} size={10} />
                {delta}
              </span>
            )}
            <span style={{ color: '#6B7280' }}>{sub}</span>
          </div>
        </div>
        {sparkline && <Sparkline points={sparkline} color={hot ? '#EA580C' : '#71717A'} width={84} height={32} />}
      </div>
    </div>
  );
}

const USER_GROWTH = [820, 920, 1040, 1180, 1320, 1480, 1640, 1820, 2010, 2240, 2480, 2740, 3020, 3320, 3640, 4000, 4380, 4790, 5240, 5720, 6240, 6800, 7400, 8040, 8720, 9440, 10200, 11020, 11880, 12400];

const TOP_VENUES = [
  { label: 'Quilox',              value: 689 },
  { label: 'Sip & Smoke Lounge',  value: 412 },
  { label: 'Hard Rock Lekki',     value: 238 },
  { label: 'Cocoon Lounge',       value: 124 },
  { label: 'Tarragon',            value: 64  },
];

const ROLES = [
  { label: 'Users',        value: 12100, color: '#6B7280' },
  { label: 'Business',     value: 48,    color: '#EAB308' },
  { label: 'Admin',        value: 12,    color: '#FB923C' },
  { label: 'Super Admin',  value: 4,     color: '#A855F7' },
];

function ReportPanel() {
  const reports = [
    { id: 'r1', who: 'Adaeze O.',  type: 'Inappropriate content',  what: 'Vibe post by @clubking_ng', sev: 'high', time: '12m' },
    { id: 'r2', who: 'Kola D.',    type: 'Fake venue listing',      what: 'Cocoon Lounge (duplicate)', sev: 'med',  time: '38m' },
    { id: 'r3', who: 'Anonymous',  type: 'Harassment',              what: '@vibechecker23',             sev: 'high', time: '1h' },
  ];
  return (
    <div className="ap-card" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: '16px 18px', borderBottom: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div className="ap-section-title">Open reports</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>3 awaiting moderation</div>
        </div>
        <span className="ap-pill ap-pill-danger">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', animation: 'apPulse 1.4s infinite' }}></span>
          Action needed
        </span>
      </div>
      <div>
        {reports.map((r) => (
          <div key={r.id} style={{
            padding: '12px 18px', borderBottom: '1px solid #F3F4F6',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: r.sev === 'high' ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
              color:      r.sev === 'high' ? '#DC2626' : '#EA580C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="flag" size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{r.type}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{r.what}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>by {r.who} · {r.time} ago</div>
            </div>
            <button className="ap-btn ap-btn-secondary" style={{ height: 28, padding: '0 10px', fontSize: 11 }}>Review</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditPanel() {
  const events = [
    { who: 'Eze Okafor',  did: 'promoted',     what: 'Quilox',         time: '4m', icon: 'rocket', color: '#FB923C' },
    { who: 'Sade Bello',  did: 'banned user',  what: '@spammer_07',    time: '22m', icon: 'ban', color: '#DC2626' },
    { who: 'Eze Okafor',  did: 'approved',     what: 'The Library Bar', time: '1h', icon: 'check-circle-2', color: '#16A34A' },
    { who: 'Tunde A.',    did: 'changed role', what: '@new_admin_jen',  time: '2h', icon: 'shield', color: '#A855F7' },
    { who: 'System',      did: 'refreshed',    what: 'trending_venues view', time: '3h', icon: 'refresh-cw', color: '#3B82F6' },
  ];
  return (
    <div className="ap-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="ap-section-title">Audit log</div>
        <button className="ap-btn ap-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: 12 }}>View all →</button>
      </div>
      <div style={{ padding: '4px 0' }}>
        {events.map((e, i) => (
          <div key={i} style={{
            padding: '10px 18px', display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: e.color + '1A', color: e.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name={e.icon} size={12} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                <strong>{e.who}</strong> <span style={{ color: '#6B7280' }}>{e.did}</span> <strong>{e.what}</strong>
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{e.time} ago</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewPage() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div className="ap-page-eyebrow">Platform overview · Friday 14 November</div>
          <h1 className="ap-page-title">Lagos at a glance</h1>
          <p className="ap-page-sub">12,400 users across 142 venues. Sign-ups <strong style={{ color: '#16A34A' }}>↑ 34%</strong> this week — your highest weekly intake since launch.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ap-btn ap-btn-secondary"><Icon name="download" size={14} />Export</button>
          <button className="ap-btn ap-btn-secondary"><Icon name="refresh-cw" size={14} />Refresh views</button>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <MetricCard hot title="Total users"    value="12,400" delta="34%" deltaUp sub="this week"  icon="users"      sparkline={USER_GROWTH.slice(-12)} />
        <MetricCard     title="MAU"             value="8,240"  delta="12%" deltaUp sub="30-day"    icon="activity"    sparkline={[5800,6020,6300,6510,6740,7020,7340,7610,7860,8040,8160,8240]} />
        <MetricCard     title="Venues"          value="142"    delta="6"   deltaUp sub="new this wk" icon="building-2" sparkline={[126,128,130,134,136,138,140,141,142,142,142,142]} />
        <MetricCard     title="Promoted"        value="8"      sub="/ 142 venues"                  icon="rocket"     sparkline={[4,5,5,6,6,7,7,8,8,8,8,8]} />
        <MetricCard     title="Revenue · 30d"   value="₦4.8M"  delta="22%" deltaUp sub="vs prev. 30d" icon="dollar-sign" sparkline={[2.4,2.6,2.8,3.0,3.2,3.5,3.8,4.0,4.2,4.4,4.6,4.8]} />
      </div>

      {/* Body grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="ap-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="ap-section-title">User growth · last 30 days</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>Cumulative signups · refreshed every 10 min</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['7d','30d','90d','12m'].map((r) => (
                <button key={r} className={'ap-btn ' + (r === '30d' ? 'ap-btn-primary' : 'ap-btn-ghost')} style={{ height: 28, padding: '0 11px', fontSize: 11 }}>{r}</button>
              ))}
            </div>
          </div>
          <AreaChart data={USER_GROWTH} color="#EA580C" />
        </div>
        <div className="ap-card" style={{ padding: 22 }}>
          <div className="ap-section-title" style={{ marginBottom: 16 }}>Users by role</div>
          <DonutChart data={ROLES} size={130} thickness={16} />
        </div>
      </div>

      {/* Hot row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        <div className="ap-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="ap-section-title">Top venues · check-ins</div>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#FB923C', textTransform: 'uppercase' }}>Last 24h</span>
          </div>
          <BarChart data={TOP_VENUES} color="#FB923C" />
        </div>
        <ReportPanel />
        <AuditPanel />
      </div>
    </div>
  );
}

window.OverviewPage = OverviewPage;
